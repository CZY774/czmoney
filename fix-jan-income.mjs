import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { error } = await supabase
  .from('transactions')
  .update({ amount: 5605000 })
  .eq('user_id', '25f2da37-cb92-448c-b2ca-ba61f94e521f')
  .eq('txn_date', '2025-01-01')
  .eq('type', 'income');

console.log(error ? `❌ Error: ${error.message}` : '✅ Fixed January 2025 income: Rp 5,605,000');
