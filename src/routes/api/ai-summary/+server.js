import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST({ request }) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  
  if (!user) {
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const { month } = body; // Format: YYYY-MM

  if (!month) {
    return json({ error: 'Month parameter required' }, { status: 400 });
  }

  try {
    // Get current month data
    const [year, monthNum] = month.split('-');
    const startDate = `${year}-${monthNum}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

    const { data: currentTransactions } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .gte('txn_date', startDate)
      .lte('txn_date', endDate);

    // Get previous month data for comparison
    const prevMonth = new Date(year, monthNum - 2, 1);
    const prevStartDate = prevMonth.toISOString().split('T')[0];
    const prevEndDate = new Date(year, monthNum - 1, 0).toISOString().split('T')[0];

    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .gte('txn_date', prevStartDate)
      .lte('txn_date', prevEndDate);

    if (!currentTransactions || currentTransactions.length === 0) {
      return json({ 
        summary: "No transactions found for this month. Start tracking your expenses to get personalized insights!" 
      });
    }

    // Calculate totals
    const currentIncome = currentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentExpense = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const prevIncome = prevTransactions
      ? prevTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
      : 0;
    
    const prevExpense = prevTransactions
      ? prevTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      : 0;

    // Calculate top categories
    const categoryTotals = {};
    currentTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const categoryName = t.categories?.name || 'No Category';
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + t.amount;
      });

    const topCategories = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name, amount]) => ({ name, amount }));

    // Calculate percentage changes
    const expenseChange = prevExpense > 0 
      ? ((currentExpense - prevExpense) / prevExpense * 100).toFixed(1)
      : 0;

    const incomeChange = prevIncome > 0
      ? ((currentIncome - prevIncome) / prevIncome * 100).toFixed(1)
      : 0;

    // Create summary data for AI
    const summaryData = {
      month: month,
      total_income: currentIncome,
      total_expense: currentExpense,
      balance: currentIncome - currentExpense,
      top_categories: topCategories,
      expense_change_pct: parseFloat(expenseChange),
      income_change_pct: parseFloat(incomeChange),
      transaction_count: currentTransactions.length
    };

    // Generate AI summary
    const prompt = `You are a concise personal finance coach. Given the monthly summary JSON below, produce a short 3-5 sentence analysis in English. Use casual friendly tone and include one concrete recommendation.

${JSON.stringify(summaryData)}

Focus on: spending patterns, month-over-month changes, and actionable advice. Keep it under 70 words.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7
    });

    const aiSummary = completion.choices[0]?.message?.content || 
      "Unable to generate summary at this time. Please try again later.";

    return json({ 
      summary: aiSummary,
      data: summaryData 
    });

  } catch (error) {
    console.error('AI Summary Error:', error);
    return json({ 
      error: 'Failed to generate summary',
      details: error.message 
    }, { status: 500 });
  }
}
