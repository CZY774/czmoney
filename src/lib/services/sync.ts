import { get, set, del } from 'idb-keyval';
import { supabase } from './supabase';
import { browser } from '$app/environment';

interface PendingTransaction {
  id: string;
  txn_date: string;
  category_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  user_id: string;
  created_at: string;
}

const PENDING_KEY = 'pending_transactions';
const CACHE_KEY = 'cached_transactions';

export async function enqueueTxn(transaction: Omit<PendingTransaction, 'id' | 'created_at'>) {
  if (!browser) return;
  
  const pending = await get(PENDING_KEY) || [];
  const newTxn: PendingTransaction = {
    ...transaction,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  };
  
  pending.push(newTxn);
  await set(PENDING_KEY, pending);
  
  return newTxn;
}

export async function processPendingQueue() {
  if (!browser) return;
  
  const pending: PendingTransaction[] = await get(PENDING_KEY) || [];
  if (pending.length === 0) return;
  
  const processed = [];
  
  for (const txn of pending) {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          txn_date: txn.txn_date,
          category_id: txn.category_id,
          type: txn.type,
          amount: txn.amount,
          description: txn.description,
          user_id: txn.user_id
        }]);
        
      if (!error) {
        processed.push(txn.id);
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  }
  
  if (processed.length > 0) {
    const remaining = pending.filter(txn => !processed.includes(txn.id));
    await set(PENDING_KEY, remaining);
  }
}

export function setupSyncListeners() {
  if (!browser) return;
  
  window.addEventListener('online', processPendingQueue);
  
  // Process queue on page focus
  window.addEventListener('focus', processPendingQueue);
}

export async function getPendingCount(): Promise<number> {
  if (!browser) return 0;
  const pending = await get(PENDING_KEY) || [];
  return pending.length;
}
