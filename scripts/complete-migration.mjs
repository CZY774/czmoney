#!/usr/bin/env node
/**
 * COMPLETE MIGRATION SCRIPT - CZmoneY
 * 
 * Urutan:
 * 1. Setup database schema (tables + RLS + default categories)
 * 2. Auto-categorize semua CSV transactions 
 * 3. Generate import SQL
 * 
 * Usage: npx node scripts/complete-migration.mjs
 */

import fs from 'fs';

console.log('🚀 CZmoneY Complete Migration Script');
console.log('=====================================\n');

// STEP 1: Generate Database Schema
console.log('📋 STEP 1: Generating database schema...');

const schemaSQL = `-- CZmoneY Database Schema & Migration
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  preferred_currency text DEFAULT 'IDR',
  monthly_income bigint DEFAULT 0,
  savings_target bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text CHECK (type IN ('income','expense')) NOT NULL,
  color text DEFAULT '#6b7280',
  created_at timestamptz DEFAULT now()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  txn_date date NOT NULL,
  category_id uuid REFERENCES categories(id),
  type text CHECK (type IN ('income','expense')) NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories (user_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (user_id, name, type, color) VALUES
    (NEW.id, 'Salary', 'income', '#10b981'),
    (NEW.id, 'Freelance', 'income', '#059669'),
    (NEW.id, 'Investment', 'income', '#047857'),
    (NEW.id, 'Food & Drink', 'expense', '#ef4444'),
    (NEW.id, 'Transport', 'expense', '#f97316'),
    (NEW.id, 'Shopping', 'expense', '#8b5cf6'),
    (NEW.id, 'Entertainment', 'expense', '#ec4899'),
    (NEW.id, 'Bills & Utilities', 'expense', '#06b6d4'),
    (NEW.id, 'Healthcare', 'expense', '#84cc16'),
    (NEW.id, 'Personal Care', 'expense', '#f59e0b'),
    (NEW.id, 'Education', 'expense', '#3b82f6'),
    (NEW.id, 'Housing', 'expense', '#6366f1'),
    (NEW.id, 'Other', 'expense', '#6b7280');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create categories
DROP TRIGGER IF EXISTS create_profile_and_categories ON profiles;
CREATE TRIGGER create_profile_and_categories
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_categories();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Done!
SELECT 'Database schema created successfully! 🎉' as status;
`;

fs.writeFileSync('1-database-schema.sql', schemaSQL);
console.log('✅ Generated: 1-database-schema.sql');

// STEP 2: Auto-categorize transactions
console.log('\n📊 STEP 2: Auto-categorizing transactions...');

const categoryMappings = {
  'Food & Drink': ['nasi', 'ayam', 'bakso', 'mie', 'soto', 'bubur', 'nasgor', 'warteg', 'capcay', 'rendang', 'katsu', 'teriyaki', 'geprek', 'bakar', 'goreng', 'serundeng', 'roti', 'kue', 'kerupuk', 'cireng', 'cilok', 'martabak', 'bakwan', 'mendoan', 'tempe', 'tahu', 'perkedel', 'risol', 'indomie', 'sarimi', 'energen', 'teh', 'kopi', 'susu', 'jus', 'es', 'air', 'aqua', 'coca', 'pocari', 'cimory', 'beras', 'telur', 'sayur', 'daging', 'ikan', 'garam', 'gula', 'minyak', 'kecap', 'saos', 'sambal'],
  'Transport': ['bensin', 'pertamax', 'ojek', 'gojek', 'grab', 'taxi', 'bus', 'angkot', 'kereta', 'parkir', 'tol', 'service', 'bengkel', 'oli', 'ban', 'aki', 'tambal', 'cuci motor', 'nitrogen', 'angin', 'tambah angin'],
  'Personal Care': ['shampo', 'shampoo', 'sabun', 'pasta gigi', 'sikat gigi', 'facial wash', 'masker', 'deodorant', 'parfum', 'axe', 'nivea', 'potong', 'cukur', 'salon', 'barbershop'],
  'Shopping': ['baju', 'kaos', 'kemeja', 'celana', 'sepatu', 'sandal', 'tas', 'jam', 'kacamata', 'topi', 'helm', 'sarung tangan', 'kaos kaki', 'underwear'],
  'Entertainment': ['bioskop', 'cinema', 'konser', 'karaoke', 'game', 'ps', 'playstation', 'badminton', 'futsal', 'bowling', 'gym', 'renang', 'wisata', 'travel'],
  'Bills & Utilities': ['listrik', 'pln', 'air', 'pdam', 'gas', 'lpg', 'wifi', 'internet', 'indihome', 'pulsa', 'kuota', 'telkomsel', 'xl', 'indosat', 'netflix', 'spotify'],
  'Healthcare': ['dokter', 'rumah sakit', 'klinik', 'apotek', 'obat', 'vitamin', 'medical', 'checkup'],
  'Education': ['uang kuliah', 'spp', 'sks', 'semester', 'registrasi', 'uang gedung', 'buku', 'alat tulis', 'pulpen', 'kertas', 'print', 'fotocopy', 'laptop', 'kursus'],
  'Housing': ['kos', 'kontrakan', 'sewa', 'apartemen', 'furniture', 'kasur', 'lemari', 'kipas']
};

function categorizeItem(description) {
  const desc = description.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) return category;
    }
  }
  return 'Other';
}

const monthMap = {
  'JANUARI': '01', 'FEBRUARI': '02', 'MARET': '03', 'APRIL': '04',
  'MEI': '05', 'JUNI': '06', 'JULI': '07', 'AGUSTUS': '08', 
  'SEPTEMBER': '09', 'OKTOBER': '10', 'NOVEMBER': '11', 'DESEMBER': '12'
};

const csvFiles = ['pengeluaran - 2022.csv', 'pengeluaran - 2023.csv', 'pengeluaran - 2024.csv', 'pengeluaran - 2025.csv'];
let allTransactions = [];
let categoryCounts = {};

csvFiles.forEach(filename => {
  try {
    const content = fs.readFileSync(filename, 'utf-8');
    const lines = content.split('\n');
    let currentMonth = '';
    const year = filename.match(/(\d{4})/)[1];
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (line.includes(' - ') && (line.includes('jt') || line.includes('k'))) {
        const monthMatch = line.match(/^([A-Z]+)/);
        if (monthMatch) currentMonth = monthMatch[1];
        return;
      }
      
      if (line.includes('HARI,BARANG') || line.includes('DAILY') || line.includes('MONTHLY')) return;
      
      const cols = line.split(',');
      if (cols.length >= 4 && cols[0] && cols[1] && cols[3]) {
        const day = cols[0].trim();
        const item = cols[1].trim();
        const amount = cols[3].trim();
        
        if (!day || !item || !amount || day === 'HARI') return;
        
        const numericAmount = amount.replace(/[^\d]/g, '');
        if (!numericAmount || numericAmount === '0') return;
        
        const category = categorizeItem(item);
        
        allTransactions.push({
          day, item, amount: parseInt(numericAmount),
          category, month: currentMonth, year
        });
        
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
    
    console.log(`✅ ${filename}: processed`);
  } catch (error) {
    console.log(`❌ ${filename}: ${error.message}`);
  }
});

console.log(`\n📊 Auto-categorized ${allTransactions.length} transactions:`);
Object.entries(categoryCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    const pct = ((count / allTransactions.length) * 100).toFixed(1);
    console.log(`  ${cat.padEnd(18)} ${count.toString().padStart(4)} (${pct}%)`);
  });

// STEP 3: Generate import SQL
console.log('\n💾 STEP 3: Generating import SQL...');

let importSQL = `-- Import ${allTransactions.length} auto-categorized transactions
-- REPLACE 'YOUR_USER_ID_HERE' with your actual user ID from Supabase auth.users table

`;

allTransactions.forEach(t => {
  const month = monthMap[t.month] || '01';
  const day = t.day.replace(/[^\d]/g, '').padStart(2, '0') || '01';
  const date = `${t.year}-${month}-${day}`;
  const desc = t.item.replace(/'/g, "''");
  
  importSQL += `INSERT INTO transactions (user_id, txn_date, category_id, type, amount, description) VALUES (
  'YOUR_USER_ID_HERE',
  '${date}',
  (SELECT id FROM categories WHERE name = '${t.category}' AND user_id = 'YOUR_USER_ID_HERE'),
  'expense',
  ${t.amount},
  '${desc}'
);\n`;
});

fs.writeFileSync('2-import-transactions.sql', importSQL);
console.log('✅ Generated: 2-import-transactions.sql');

// STEP 4: Instructions
console.log('\n🎯 MIGRATION COMPLETE!');
console.log('====================');
console.log('\n📋 NEXT STEPS:');
console.log('1. Open Supabase SQL Editor');
console.log('2. Run: 1-database-schema.sql');
console.log('3. Get your user ID after signup');
console.log('4. Replace YOUR_USER_ID_HERE in 2-import-transactions.sql');
console.log('5. Run: 2-import-transactions.sql');
console.log('6. Done! 🎉');

console.log('\n💡 How to get your user ID:');
console.log('   SELECT id FROM auth.users WHERE email = \'your@email.com\';');

console.log(`\n📊 Summary: ${allTransactions.length} transactions ready to import!`);
