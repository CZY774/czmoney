import { json, type RequestHandler } from "@sveltejs/kit";
import { GoogleGenAI } from "@google/genai";
import { checkAIRateLimit } from "$lib/security/ratelimit";
import { validateAndSanitize, aiSummarySchema } from "$lib/security/sanitize";
import { authenticate, getSupabaseClient } from "$lib/middleware/auth";
import { handleError, AppError, logError } from "$lib/services/errorHandler";

async function handleRequest(request: Request, url: URL) {
  try {
    const { error, user } = await authenticate(request);
    if (error) return error;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new AppError("AI service temporarily unavailable", 503);
    }

    const { success } = await checkAIRateLimit(user!.id);
    if (!success) {
      throw new AppError("Rate limit exceeded. Try again later.", 429);
    }

    const supabase = getSupabaseClient();
    const genAI = new GoogleGenAI({ apiKey: geminiKey });

    let month = url.searchParams.get("month");
    let lookback = parseInt(url.searchParams.get("lookback") || "3");
    let forceRefresh = url.searchParams.get("refresh") === "true";

    if (!month && request.method === "POST") {
      const body = await request.json();
      month = body.month;
      lookback = body.lookback || 3;
      forceRefresh = body.refresh || false;
    }

    if (!month) {
      throw new AppError("Month parameter required (YYYY-MM)", 400);
    }

    validateAndSanitize(aiSummarySchema, { month });
    if (lookback < 1 || lookback > 12) lookback = 3;

    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("ai_summaries")
        .select("*")
        .eq("user_id", user!.id)
        .eq("month", month)
        .maybeSingle();

      if (cached) {
        const { count } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .gte("txn_date", `${month}-01`)
          .lte("txn_date", `${month}-31`);

        return json({
          summary: cached.summary,
          generated_at: cached.generated_at,
          is_stale: cached.transaction_count !== count,
          transaction_count: count,
          cached_count: cached.transaction_count,
        });
      }
    }

    const historicalData = [];
    const currentDate = new Date(`${month}-01`);

    for (let i = 0; i < lookback; i++) {
      const targetDate = new Date(currentDate);
      targetDate.setMonth(targetDate.getMonth() - i);

      const targetYear = targetDate.getFullYear();
      const targetMonth = String(targetDate.getMonth() + 1).padStart(2, "0");
      const targetStartDate = `${targetYear}-${targetMonth}-01`;
      const targetEndDate = new Date(targetYear, targetDate.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const { data: monthTransactions } = await supabase
        .from("transactions")
        .select("*, categories(name)")
        .eq("user_id", user!.id)
        .gte("txn_date", targetStartDate)
        .lte("txn_date", targetEndDate);

      if (monthTransactions && monthTransactions.length > 0) {
        const monthIncome = monthTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        const monthExpense = monthTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        const categoryTotals: Record<string, number> = {};
        monthTransactions
          .filter((t) => t.type === "expense")
          .forEach((t) => {
            const categoryName =
              (t.categories as unknown as { name: string } | null)?.name ||
              "No Category";
            categoryTotals[categoryName] =
              (categoryTotals[categoryName] || 0) + t.amount;
          });

        // Extract notable expense patterns (top 5 largest with descriptions)
        const notableExpenses = monthTransactions
          .filter((t) => t.type === "expense")
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
          .map((t) => ({
            amount: t.amount,
            category: (t.categories as unknown as { name: string } | null)
              ?.name,
            description: t.description || "No description",
            context:
              t.description?.toLowerCase().includes("lebaran") ||
              t.description?.toLowerCase().includes("holiday") ||
              t.description?.toLowerCase().includes("gift") ||
              t.description?.toLowerCase().includes("emergency") ||
              t.description?.toLowerCase().includes("repair") ||
              t.description?.toLowerCase().includes("medical")
                ? "seasonal/one-time"
                : "regular",
          }));

        historicalData.push({
          month: `${targetYear}-${targetMonth}`,
          income: monthIncome,
          expense: monthExpense,
          balance: monthIncome - monthExpense,
          categories: categoryTotals,
          transactionCount: monthTransactions.length,
          notableExpenses,
        });
      }
    }

    if (historicalData.length === 0) {
      return json({
        summary:
          "No transaction history found. Start tracking your expenses to get personalized insights!",
        generated_at: new Date().toISOString(),
        is_stale: false,
        transaction_count: 0,
      });
    }

    const currentMonthData = historicalData[0];
    const avgExpense =
      historicalData.reduce((sum, m) => sum + m.expense, 0) /
      historicalData.length;
    const avgIncome =
      historicalData.reduce((sum, m) => sum + m.income, 0) /
      historicalData.length;

    const expenseChange =
      historicalData.length > 1
        ? (
            ((currentMonthData.expense - historicalData[1].expense) /
              historicalData[1].expense) *
            100
          ).toFixed(1)
        : "0";

    const incomeChange =
      historicalData.length > 1
        ? (
            ((currentMonthData.income - historicalData[1].income) /
              historicalData[1].income) *
            100
          ).toFixed(1)
        : "0";

    const allCategories: Record<string, number[]> = {};
    historicalData.forEach((monthData) => {
      Object.entries(monthData.categories).forEach(([cat, amount]) => {
        if (!allCategories[cat]) allCategories[cat] = [];
        allCategories[cat].push(amount as number);
      });
    });

    const categoryInsights = Object.entries(allCategories)
      .map(([cat, amounts]) => ({
        name: cat,
        currentAmount: amounts[0] || 0,
        avgAmount: amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length,
        trend:
          amounts.length > 1
            ? (((amounts[0] - amounts[1]) / amounts[1]) * 100).toFixed(1)
            : "0",
      }))
      .sort((a, b) => b.currentAmount - a.currentAmount)
      .slice(0, 5);

    const summaryData = {
      current_month: month,
      lookback_months: lookback,
      current_data: {
        income: currentMonthData.income,
        expense: currentMonthData.expense,
        balance: currentMonthData.balance,
        transaction_count: currentMonthData.transactionCount,
      },
      trends: {
        expense_change_pct: parseFloat(expenseChange),
        income_change_pct: parseFloat(incomeChange),
        vs_average_expense: (
          ((currentMonthData.expense - avgExpense) / avgExpense) *
          100
        ).toFixed(1),
        vs_average_income: (
          ((currentMonthData.income - avgIncome) / avgIncome) *
          100
        ).toFixed(1),
      },
      category_insights: categoryInsights,
      historical_summary: {
        avg_monthly_expense: Math.round(avgExpense),
        avg_monthly_income: Math.round(avgIncome),
        months_analyzed: historicalData.length,
        previous_month_income:
          historicalData.length > 1 ? historicalData[1].income : 0,
        income_timing_pattern: {
          current_month_income: currentMonthData.income,
          previous_month_income:
            historicalData.length > 1 ? historicalData[1].income : 0,
          has_early_payment: historicalData
            .slice(0, 2)
            .flatMap((m) => m.notableExpenses || [])
            .some((e) => e.context === "seasonal/one-time"),
        },
        notable_spending: historicalData.map((m) => ({
          month: m.month,
          top_expenses: m.notableExpenses,
        })),
      },
    };

    const prompt = `You're a chill Gen Z finance advisor. Analyze this ${lookback}-month financial data and give real talk insights. Be specific about trends and drop ONE solid recommendation.

IMPORTANT CONTEXT:
- Check notable_spending for top 5 expenses per month with descriptions
- Items marked "seasonal/one-time" (holiday, gift, emergency, repair, medical) = normal spikes
- Items marked "regular" = recurring spending, watch for patterns
- If you see specific items (e.g., "tiket bis", "starbucks", "mall"), mention them in your advice
- All numbers are pre-calculated, focus on analyzing spending behavior

DATA:
${JSON.stringify(summaryData)}

ANALYSIS FOCUS:
1. Income vs expense balance: Is it healthy?
2. Top expenses: Any recurring unnecessary spending? (check descriptions)
3. One specific actionable tip based on actual items/services they bought

RESPONSE FORMAT:
- Plain text only, NO markdown (no **, __, *, etc.)
- Casual Gen Z English, max 80 words
- If big spike is seasonal, say it's chill. If it's regular unnecessary spending, call it out with specific examples`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const aiSummary =
      response.text || "Unable to generate insights at this time.";

    await supabase.from("ai_summaries").upsert({
      user_id: user!.id,
      month: month,
      summary: aiSummary,
      transaction_count: currentMonthData.transactionCount,
      generated_at: new Date().toISOString(),
    });

    return json({
      summary: aiSummary,
      generated_at: new Date().toISOString(),
      is_stale: false,
      transaction_count: currentMonthData.transactionCount,
    });
  } catch (error) {
    logError(error, "AI Summary");

    if (error instanceof AppError) {
      return json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Error) {
      if (
        error.message.includes("Gemini") ||
        error.message.includes("GoogleGenerativeAI")
      ) {
        return json(
          {
            error: "AI service unavailable",
            details: "Gemini API error - check API key and quota",
          },
          { status: 503 },
        );
      }
    }

    return handleError(error, "AI Summary");
  }
}

export const GET: RequestHandler = async ({ request, url }) => {
  return handleRequest(request, url);
};

export const POST: RequestHandler = async ({ request, url }) => {
  return handleRequest(request, url);
};
