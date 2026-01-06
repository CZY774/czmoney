import { createClient } from "@supabase/supabase-js";
import { json, type RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkRateLimit } from "$lib/security/ratelimit";
import type { Database } from "$lib/types/database";

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseKey);
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
      .select("category_id, amount")
      .eq("user_id", user!.id)
      .eq("type", "expense")
      .gte("txn_date", startOfMonth)
      .lte("txn_date", endOfMonth);

    // Get budgets with category names
    const { data: budgets } = await supabase!
      .from("budgets")
      .select(
        `
        id,
        category_id,
        monthly_limit,
        alert_threshold,
        categories(name)
      `,
      )
      .eq("user_id", user!.id);

    // Get profile
    const { data: profile } = await supabase!
      .from("profiles")
      .select("monthly_income, savings_target")
      .eq("id", user!.id)
      .single();

    const insights: Array<{
      type: string;
      severity: "critical" | "high" | "medium" | "low";
      title: string;
      message: string;
      data: Record<string, unknown>;
    }> = [];

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
          const categoryName =
            (budget.categories as unknown as { name: string } | null)?.name ||
            "Unknown";

          insights.push({
            type: "budget_alert",
            severity:
              percentage >= 100
                ? "critical"
                : percentage >= 90
                  ? "high"
                  : "medium",
            title: `${categoryName} Budget Alert`,
            message:
              percentage >= 100
                ? `You've exceeded your ${categoryName} budget by ${((spent - budget.monthly_limit) / 1000).toFixed(0)}k`
                : `${percentage.toFixed(0)}% of ${categoryName} budget used (${(remaining / 1000).toFixed(0)}k remaining)`,
            data: {
              category: categoryName,
              spent,
              limit: budget.monthly_limit,
              percentage,
            },
          });
        }
      });
    }

    // 2. PREDICTIVE SPENDING
    if (currentSpending && profile?.monthly_income) {
      const totalSpent = currentSpending.reduce((sum, t) => sum + t.amount, 0);
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const daysPassed = now.getDate();
      const dailyAverage = totalSpent / daysPassed;
      const projectedSpending = dailyAverage * daysInMonth;

      if (projectedSpending > profile.monthly_income * 0.9) {
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
      const { data: income } = await supabase!
        .from("transactions")
        .select("amount")
        .eq("user_id", user!.id)
        .eq("type", "income")
        .gte("txn_date", startOfMonth)
        .lte("txn_date", endOfMonth);

      const monthlyIncome = income?.reduce((sum, t) => sum + t.amount, 0) || 0;
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

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    insights.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    return json({ insights: insights.slice(0, 5) });
  } catch (error) {
    console.error("Smart insights error:", error);
    return json({ error: "Failed to generate insights" }, { status: 500 });
  }
};
