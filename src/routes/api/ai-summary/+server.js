import { json } from "@sveltejs/kit";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "$env/static/private";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function POST({ request, locals }) {
  try {
    const { month, totalIncome, totalExpense, changeVsPrev, topCategories } =
      await request.json();

    // Validate inputs
    if (!month || totalIncome === undefined || totalExpense === undefined) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build prompt
    const monthName = new Date(month + "-01").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const topCategoriesText = topCategories
      .map((c) => `${c.name}: ${c.percentage}%`)
      .join(", ");

    const changeText =
      changeVsPrev > 0
        ? `${changeVsPrev.toFixed(1)}% increase`
        : `${Math.abs(changeVsPrev).toFixed(1)}% decrease`;

    const prompt = `You are a concise personal finance coach. Generate a brief 3-5 sentence analysis for ${monthName} with this data:

- Total Income: ${totalIncome.toLocaleString("id-ID")} IDR
- Total Expense: ${totalExpense.toLocaleString("id-ID")} IDR
- Change vs Previous Month: ${changeText}
- Top Spending Categories: ${topCategoriesText}

Provide a friendly, casual analysis highlighting the main spending pattern and ONE specific actionable recommendation. Keep it under 70 words. No markdown formatting.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful personal finance advisor who gives concise, friendly advice.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const summary =
      completion.choices[0]?.message?.content?.trim() ||
      "Unable to generate summary";

    return json({ summary });
  } catch (error) {
    console.error("AI Summary Error:", error);
    return json(
      {
        error: "Failed to generate AI summary",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
