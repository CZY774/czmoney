import { createClient } from "@supabase/supabase-js";
import { json, type RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkRateLimit } from "$lib/security/ratelimit";

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

async function authenticate(request: Request) {
  if (!supabase) {
    return {
      error: json({ error: "Service unavailable" }, { status: 503 }),
      user: null,
    };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return {
      error: json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return {
      error: json({ error: "Invalid token" }, { status: 401 }),
      user: null,
    };
  }

  return { error: null, user };
}

export const GET: RequestHandler = async ({ request }) => {
  const { error, user } = await authenticate(request);
  if (error) return error;

  const { success } = await checkRateLimit(user!.id);
  if (!success) {
    return json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const startOfMonth = `${currentMonth}-01`;
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    // Get current month spending by category
    const { data: currentSpending } = await supabase!
      .from("transactions")
      .select("category_id, amount, categories(name)")
      .eq("user_id", user!.id)
      .eq("type", "expense")
      .gte("txn_date", startOfMonth)
      .lte("txn_date", endOfMonth);

    // Get budgets
    const { data: budgets } = await supabase!
      .from("budgets")
      .select("*, categories(name)")
      .eq("user_id", user!.id);

    // Get profile for goals
    const { data: profile } = await supabase!
      .from("profiles")
      .select("monthly_income, savings_target, emergency_fund_target")
      .eq("id", user!.id)
      .single();

    // Calculate insights
    const insights = [];

    // 1. BUDGET ALERTS
    if (budgets && currentSpending) {
      const spendingByCategory: Record<string, number> = {};
      currentSpending.forEach((t) => {
        const catId = t.category_id || "uncategorized";
        spendingByCategory[catId] = (spendingByCategory[catId] || 0) + t.amount;
      });

      budgets.forEach((budget) => {
        const spent = spendingByCategory[budget.category_id] || 0;
        const percentage = (spent / budget.monthly_limit) * 100;

        if (percentage >= budget.alert_threshold) {
          const remaining = budget.monthly_limit - spent;
          insights.push({
            type: "budget_alert",
            severity:
              percentage >= 100
                ? "critical"
                : percentage >= 90
                  ? "high"
                  : "medium",
            title: `${budget.categories?.name} Budget Alert`,
            message:
              percentage >= 100
                ? `You've exceeded your ${budget.categories?.name} budget by ${((spent - budget.monthly_limit) / 1000).toFixed(0)}k`
                : `${percentage.toFixed(0)}% of ${budget.categories?.name} budget used (${(remaining / 1000).toFixed(0)}k remaining)`,
            data: {
              category: budget.categories?.name,
              spent,
              limit: budget.monthly_limit,
              percentage,
            },
          });
        }
      });
    }

    // 2. PREDICTIVE SPENDING
    if (currentSpending && profile) {
      const totalSpent = currentSpending.reduce((sum, t) => sum + t.amount, 0);
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const daysPassed = now.getDate();
      const dailyAverage = totalSpent / daysPassed;
      const projectedSpending = dailyAverage * daysInMonth;

      if (
        profile.monthly_income &&
        projectedSpending > profile.monthly_income * 0.9
      ) {
        const overspend = projectedSpending - profile.monthly_income;
        insights.push({
          type: "overspend_prediction",
          severity: "high",
          title: "Overspending Alert",
          message: `At current rate, you'll overspend by ${(overspend / 1000).toFixed(0)}k this month`,
          data: {
            projected: projectedSpending,
            income: profile.monthly_income,
            overspend,
          },
        });
      }
    }

    // 3. SAVINGS GOAL PROGRESS
    if (profile?.savings_target && currentSpending) {
      const totalIncome = await supabase!
        .from("transactions")
        .select("amount")
        .eq("user_id", user!.id)
        .eq("type", "income")
        .gte("txn_date", startOfMonth)
        .lte("txn_date", endOfMonth);

      const monthlyIncome =
        totalIncome.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalSpent = currentSpending.reduce((sum, t) => sum + t.amount, 0);
      const currentSavings = monthlyIncome - totalSpent;
      const savingsProgress = (currentSavings / profile.savings_target) * 100;

      if (savingsProgress < 50) {
        const shortfall = profile.savings_target - currentSavings;
        insights.push({
          type: "savings_goal",
          severity: savingsProgress < 25 ? "high" : "medium",
          title: "Savings Goal Behind",
          message: `You're ${(shortfall / 1000).toFixed(0)}k short of your monthly savings target`,
          data: {
            current: currentSavings,
            target: profile.savings_target,
            progress: savingsProgress,
          },
        });
      }
    }

    // 4. SEASONAL PATTERNS (last 12 months)
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const { data: historicalData } = await supabase!
      .from("transactions")
      .select("txn_date, amount, categories(name)")
      .eq("user_id", user!.id)
      .eq("type", "expense")
      .gte("txn_date", yearAgo.toISOString().split("T")[0]);

    if (historicalData && historicalData.length > 0) {
      // Group by month and category
      const monthlySpending: Record<string, Record<string, number>> = {};

      historicalData.forEach((t) => {
        const month = t.txn_date.slice(0, 7);
        const category = t.categories?.name || "Other";

        if (!monthlySpending[month]) monthlySpending[month] = {};
        monthlySpending[month][category] =
          (monthlySpending[month][category] || 0) + t.amount;
      });

      // Find seasonal spikes (current month vs average)
      const currentMonthCategories = monthlySpending[currentMonth] || {};
      const allMonths = Object.keys(monthlySpending);

      Object.entries(currentMonthCategories).forEach(([category, amount]) => {
        const historicalAmounts = allMonths
          .filter((m) => m !== currentMonth)
          .map((m) => monthlySpending[m][category] || 0)
          .filter((a) => a > 0);

        if (historicalAmounts.length > 0) {
          const average =
            historicalAmounts.reduce((sum, a) => sum + a, 0) /
            historicalAmounts.length;
          const increase = ((amount - average) / average) * 100;

          if (increase > 50 && amount > 100000) {
            // 50% increase and > 100k
            insights.push({
              type: "seasonal_spike",
              severity: "medium",
              title: "Seasonal Spending Spike",
              message: `${category} spending is ${increase.toFixed(0)}% higher than usual this month`,
              data: { category, current: amount, average, increase },
            });
          }
        }
      });
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    insights.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    return json({ insights: insights.slice(0, 5) }); // Top 5 insights
  } catch (error) {
    console.error("Smart insights error:", error);
    return json({ error: "Failed to generate insights" }, { status: 500 });
  }
};
