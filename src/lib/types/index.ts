export interface Transaction {
  id: string;
  user_id: string;
  txn_date: string;
  category_id: string;
  type: 'income' | 'expense';
  amount: number;
  description?: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  preferred_currency: string;
  monthly_income?: number;
  savings_target?: number;
  created_at: string;
}

export interface MonthlyReport {
  month: string;
  total_income: number;
  total_expense: number;
  balance: number;
  categories: CategorySummary[];
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  type: 'income' | 'expense';
  total: number;
  count: number;
}

export interface AIInsight {
  month: string;
  summary: string;
  generated_at: string;
}
