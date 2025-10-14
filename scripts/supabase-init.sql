-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  preferred_currency text DEFAULT 'IDR',
  monthly_income bigint DEFAULT 0,
  savings_target bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text CHECK (type IN ('income','expense')) NOT NULL,
  color text DEFAULT '#1f8ef1',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name, type)
);

-- Transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  txn_date date NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  type text CHECK (type IN ('income','expense')) NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  description text,
  synced boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reminders table
CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  frequency text CHECK (frequency IN ('daily','weekly','monthly')) NOT NULL,
  time time NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_date ON transactions (user_id, txn_date DESC);
CREATE INDEX idx_transactions_category ON transactions (category_id);
CREATE INDEX idx_categories_user ON categories (user_id);
CREATE INDEX idx_reminders_user ON reminders (user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for categories
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reminders
CREATE POLICY "Users can view own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert default categories for new users (optional)
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (NEW.id, 'Salary', 'income', '#10b981'),
    (NEW.id, 'Freelance', 'income', '#14b8a6'),
    (NEW.id, 'Investment', 'income', '#06b6d4'),
    (NEW.id, 'Food & Drink', 'expense', '#ef4444'),
    (NEW.id, 'Transport', 'expense', '#f59e0b'),
    (NEW.id, 'Shopping', 'expense', '#ec4899'),
    (NEW.id, 'Entertainment', 'expense', '#8b5cf6'),
    (NEW.id, 'Bills & Utilities', 'expense', '#6366f1'),
    (NEW.id, 'Healthcare', 'expense', '#f43f5e'),
    (NEW.id, 'Other', 'expense', '#64748b');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.create_default_categories();