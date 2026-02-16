import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";
import { checkRateLimit } from "$lib/security/ratelimit";
import type { Database } from "$lib/types/database";

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseKey);
}

export const GET: RequestHandler = async ({ request }) => {
  const rateLimitResult = await checkRateLimit(request, "category-trends");
  if (!rateLimitResult.success) {
    return json({ error: "Too many requests" }, { status: 429 });
  }

  if (!supabase) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period");
  const period = parseInt(periodParam || "3");

  if (![3, 6, 12].includes(period)) {
    return json(
      { error: "Invalid period. Must be 3, 6, or 12" },
      { status: 400 },
    );
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - period);

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("amount, date, categories(name, color)")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .returns<
        Array<{
          amount: number;
          date: string;
          categories: { name: string; color: string } | null;
        }>
      >();

    if (error) throw error;

    const result = processTransactionsForChart(transactions || [], period);

    return json({ success: true, data: result });
  } catch (error) {
    console.error("Category trends error:", error);
    return json({ error: "Failed to fetch category trends" }, { status: 500 });
  }
};

function processTransactionsForChart(
  transactions: Array<{
    date: string;
    amount: number;
    categories: { name: string; color: string } | null;
  }>,
  period: number,
) {
  const months: string[] = [];
  const now = new Date();
  for (let i = period - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(date.toISOString().slice(0, 7));
  }

  const categoryMap = new Map<
    string,
    {
      name: string;
      color: string;
      amounts: number[];
    }
  >();

  transactions.forEach((t) => {
    const category = t.categories;
    if (!category) return;

    const month = t.date.slice(0, 7);
    const monthIndex = months.indexOf(month);

    if (monthIndex === -1) return;

    if (!categoryMap.has(category.name)) {
      categoryMap.set(category.name, {
        name: category.name,
        color: category.color,
        amounts: new Array(months.length).fill(0),
      });
    }

    const cat = categoryMap.get(category.name)!;
    cat.amounts[monthIndex] += t.amount;
  });

  return {
    months: months.map((m) => {
      const [year, month] = m.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    }),
    categories: Array.from(categoryMap.values()),
  };
}
