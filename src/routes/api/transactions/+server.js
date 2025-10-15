import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET({ url, request }) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  
  if (!user) {
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  const month = url.searchParams.get('month');
  const category = url.searchParams.get('category');
  const type = url.searchParams.get('type');

  let query = supabase
    .from('transactions')
    .select('*, categories(name)')
    .eq('user_id', user.id)
    .order('txn_date', { ascending: false });

  if (month) {
    const [year, monthNum] = month.split('-');
    const startDate = `${year}-${monthNum}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
    query = query.gte('txn_date', startDate).lte('txn_date', endDate);
  }

  if (category) {
    query = query.eq('category_id', category);
  }

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data });
}

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
  const { txn_date, category_id, type, amount, description } = body;

  if (!txn_date || !type || !amount || amount <= 0) {
    return json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      user_id: user.id,
      txn_date,
      category_id,
      type,
      amount: parseInt(amount),
      description
    }])
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data });
}

export async function PUT({ request }) {
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
  const { id, txn_date, category_id, type, amount, description } = body;

  if (!id) {
    return json({ error: 'Transaction ID required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('transactions')
    .update({
      txn_date,
      category_id,
      type,
      amount: parseInt(amount),
      description
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data });
}

export async function DELETE({ request }) {
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
  const { id } = body;

  if (!id) {
    return json({ error: 'Transaction ID required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
}
