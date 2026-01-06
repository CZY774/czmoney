import { createClient } from "@supabase/supabase-js";
import { json, type RequestHandler } from "@sveltejs/kit";
import { GoogleGenAI } from "@google/genai";
import { env } from "$env/dynamic/private";
import { checkAIRateLimit } from "$lib/security/ratelimit";
import { validateAndSanitize, aiSummarySchema } from "$lib/security/sanitize";

async function handleRequest(request: Request, url: URL) {
  try {
    // Get environment variables using SvelteKit's env
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiKey = env.GEMINI_API_KEY;

    // Check if services are available
    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      return json(
        {
          error: "AI service temporarily unavailable",
          details: "Missing configuration",
        },
        { status: 503 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenAI({ apiKey: geminiKey });

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return json({ error: "Invalid token" }, { status: 401 });
    }

    // Strict rate limit for AI (expensive)
    const { success } = await checkAIRateLimit(user.id);
    if (!success) {
      return json(
        { error: "Rate limit exceeded. Try again later.", remaining: 0 },
        { status: 429 },
      );
    }

    // Get month from URL params (GET) or request body (POST)
    let month = url.searchParams.get("month");
    let lookback = parseInt(url.searchParams.get("lookback") || "1");

    if (!month && request.method === "POST") {
      const body = await request.json();
      month = body.month;
      lookback = body.lookback || 3; // Default 3 months lookback
    }

    if (!month) {
      return json(
        { error: "Month parameter required (YYYY-MM)" },
        { status: 400 },
      );
    }

    // Validate inputs
    try {
      validateAndSanitize(aiSummarySchema, { month });
      if (lookback < 1 || lookback > 12) lookback = 3;
    } catch {
      return json(
        { error: "Invalid month format (use YYYY-MM)" },
        { status: 400 },
      );
    }

    // Get historical data for comparison (lookback months)
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
        .eq("user_id", user.id)
        .gte("txn_date", targetStartDate)
        .lte("txn_date", targetEndDate);

      if (monthTransactions && monthTransactions.length > 0) {
        const monthIncome = monthTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        const monthExpense = monthTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        // Category breakdown
        const categoryTotals: Record<string, number> = {};
        monthTransactions
          .filter((t) => t.type === "expense")
          .forEach((t) => {
            const categoryName = t.categories?.name || "No Category";
            categoryTotals[categoryName] =
              (categoryTotals[categoryName] || 0) + t.amount;
          });

        historicalData.push({
          month: `${targetYear}-${targetMonth}`,
          income: monthIncome,
          expense: monthExpense,
          balance: monthIncome - monthExpense,
          categories: categoryTotals,
          transactionCount: monthTransactions.length,
          transactions: monthTransactions, // Include full transaction data
        });
      }
    }

    if (historicalData.length === 0) {
      return json({
        summary:
          "No transaction history found. Start tracking your expenses to get personalized insights!",
      });
    }

    const currentMonthData = historicalData[0];
    const avgExpense =
      historicalData.reduce((sum, m) => sum + m.expense, 0) /
      historicalData.length;
    const avgIncome =
      historicalData.reduce((sum, m) => sum + m.income, 0) /
      historicalData.length;

    // Calculate trends
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

    // Find top spending categories across all months
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

    // Create enhanced summary data for AI
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
        previous_month_income: historicalData.length > 1 ? historicalData[1].income : 0,
        income_timing_pattern: {
          current_month_income: currentMonthData.income,
          previous_month_income: historicalData.length > 1 ? historicalData[1].income : 0,
          // Include transaction descriptions to detect salary timing
          recent_income_descriptions: historicalData
            .slice(0, 2)
            .flatMap(m => m.transactions || [])
            .filter(t => t.type === 'income' && t.description)
            .map(t => ({ amount: t.amount, description: t.description, date: t.txn_date }))
            .slice(0, 5)
        }
      },
    };

    // Enhanced AI prompt for better insights
    const prompt = `You are a sharp Indonesian personal finance advisor. Analyze this ${lookback}-month financial data and provide actionable insights in Indonesian. Be specific about trends and give ONE concrete recommendation.

IMPORTANT CONTEXT:
- Look at transaction descriptions for salary timing clues (e.g., "untuk januari 2026" means January salary paid in December)
- If current month has low/zero income but previous month had income with future month description, this is normal
- Analyze spending patterns and give practical advice

DATA:
${JSON.stringify(summaryData)}

ANALYSIS FOCUS:
1. Income patterns: Check descriptions for salary timing (e.g., salary paid early)
2. Spending trends: Any concerning changes?
3. One specific actionable advice

Respond in casual Indonesian, max 80 words. If you see salary paid early in descriptions, mention this is good financial planning.`;

    // Stream the response
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const aiSummary =
      response.text || "Unable to generate insights at this time.";

    return new Response(aiSummary, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("AI Summary Error:", error);

    // More specific error handling
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
      if (
        error.message.includes("supabase") ||
        error.message.includes("database")
      ) {
        return json(
          {
            error: "Database error",
            details: "Unable to fetch transaction data",
          },
          { status: 503 },
        );
      }
    }

    return json(
      {
        error: "Failed to generate summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const GET: RequestHandler = async ({ request, url }) => {
  return handleRequest(request, url);
};

export const POST: RequestHandler = async ({ request, url }) => {
  return handleRequest(request, url);
};
