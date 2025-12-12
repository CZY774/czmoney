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
    if (!month && request.method === "POST") {
      const body = await request.json();
      month = body.month;
    }

    if (!month) {
      return json(
        { error: "Month parameter required (YYYY-MM)" },
        { status: 400 },
      );
    }

    // Validate month format
    try {
      validateAndSanitize(aiSummarySchema, { month });
    } catch {
      return json(
        { error: "Invalid month format (use YYYY-MM)" },
        { status: 400 },
      );
    }

    // Get current month transactions
    const [year, monthNum] = month.split("-");
    const startDate = `${year}-${monthNum}-01`;
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0)
      .toISOString()
      .split("T")[0];

    const { data: currentTransactions } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("user_id", user.id)
      .gte("txn_date", startDate)
      .lte("txn_date", endDate);

    if (!currentTransactions || currentTransactions.length === 0) {
      return json({
        summary:
          "No transactions found for this month. Start tracking your expenses to get personalized insights!",
      });
    }

    // Calculate totals
    const currentIncome = currentTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const currentExpense = currentTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Get previous month for comparison
    const prevMonth = new Date(parseInt(year), parseInt(monthNum) - 2, 1);
    const prevYear = prevMonth.getFullYear();
    const prevMonthNum = String(prevMonth.getMonth() + 1).padStart(2, "0");
    const prevStartDate = `${prevYear}-${prevMonthNum}-01`;
    const prevEndDate = new Date(prevYear, prevMonth.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data: prevTransactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("txn_date", prevStartDate)
      .lte("txn_date", prevEndDate);

    const prevIncome = prevTransactions
      ? prevTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0)
      : 0;

    const prevExpense = prevTransactions
      ? prevTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0)
      : 0;

    // Calculate top categories
    const categoryTotals: Record<string, number> = {};
    currentTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const categoryName = t.categories?.name || "No Category";
        categoryTotals[categoryName] =
          (categoryTotals[categoryName] || 0) + t.amount;
      });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([name, amount]) => ({ name, amount: amount as number }));

    // Calculate percentage changes
    const expenseChange =
      prevExpense > 0
        ? (((currentExpense - prevExpense) / prevExpense) * 100).toFixed(1)
        : "0";

    const incomeChange =
      prevIncome > 0
        ? (((currentIncome - prevIncome) / prevIncome) * 100).toFixed(1)
        : "0";

    // Create summary data for AI
    const summaryData = {
      month: month,
      total_income: currentIncome,
      total_expense: currentExpense,
      balance: currentIncome - currentExpense,
      top_categories: topCategories,
      expense_change_pct: parseFloat(expenseChange),
      income_change_pct: parseFloat(incomeChange),
      transaction_count: currentTransactions.length,
    };

    // Generate AI summary
    const prompt = `You are a concise personal finance coach. Given the monthly summary JSON below, produce a short 3-5 sentence analysis in English. Use casual friendly tone and include one concrete recommendation.

${JSON.stringify(summaryData)}

Focus on: spending patterns, month-over-month changes, and actionable advice. Keep it under 70 words.`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const aiSummary =
      response.text ||
      "Unable to generate summary at this time. Please try again later.";

    return json({
      summary: aiSummary,
      data: summaryData,
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
