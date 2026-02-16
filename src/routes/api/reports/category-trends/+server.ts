import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { supabase } from "$lib/services/supabase";
import { rateLimit } from "$lib/security/rate-limit";

export const GET: RequestHandler = async ({ request, locals }) => {
  const rateLimitResult = await rateLimit(request, "category-trends", 10, 10);
  if (!rateLimitResult.success) {
    return json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await locals.getSession();
  if (!session?.user) {
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
      .eq("user_id", session.user.id)
      .eq("type", "expense")
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString());

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
  period: number
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
