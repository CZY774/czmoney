import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

export async function POST({ request, locals }) {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { month } = await request.json();
  
  try {
    // Get transactions for the month
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', locals.user.id)
      .gte('txn_date', `${month}-01`)
      .lt('txn_date', `${month}-32`);

    if (!transactions || transactions.length === 0) {
      return json({ summary: 'No transactions found for this month.' });
    }

    // Calculate totals
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    // Get top categories
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category_id] = (categoryTotals[t.category_id] || 0) + t.amount;
    });
    
    const topCategories = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([id, amount]) => ({ id, amount }));

    const prompt = `You are a personal finance coach. Analyze this monthly data and provide 3-4 sentences of insight and advice:

Income: ${income}
Expenses: ${expenses}
Balance: ${income - expenses}
Top expense categories: ${topCategories.map(c => c.amount).join(', ')}

Keep it friendly, concise, and actionable.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150
    });

    return json({ summary: completion.choices[0].message.content });
  } catch (error) {
    console.error('AI Summary error:', error);
    return json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
