#!/usr/bin/env node

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORY_MAP = {
  'bensin': 'Transport',
  'galon': 'Bills & Utilities', 
  'telur': 'Food & Drink',
  'beras': 'Food & Drink',
  'mie': 'Food & Drink',
  'nasi': 'Food & Drink',
  'ayam': 'Food & Drink',
  'potong': 'Healthcare',
  'badminton': 'Entertainment',
  'persembahan': 'Other',
  'kos': 'Bills & Utilities',
  'wifi': 'Bills & Utilities',
  'kuota': 'Bills & Utilities',
  'laundry': 'Bills & Utilities',
  'spotify': 'Entertainment'
};

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  return parseInt(amountStr.replace(/[Rp.,]/g, '')) || 0;
}

function categorizeItem(item) {
  const lower = item.toLowerCase();
  for (const [key, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return category;
  }
  return 'Other';
}

async function getUserCategories(userId) {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId);
  
  return data.reduce((acc, cat) => {
    acc[cat.name] = cat.id;
    return acc;
  }, {});
}

async function migrateCSV(filePath, userId, year) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parse(content, { skip_empty_lines: true });
  
  const categories = await getUserCategories(userId);
  const transactions = [];
  
  let monthNum = 1;
  
  for (const row of rows) {
    if (!row[0] || row[0].includes('DAILY') || row[0].includes('MONTHLY')) continue;
    
    // Detect month headers
    if (row[0].includes('JANUARI')) { monthNum = 1; continue; }
    if (row[0].includes('FEBRUARI')) { monthNum = 2; continue; }
    if (row[0].includes('MARET')) { monthNum = 3; continue; }
    if (row[0].includes('APRIL')) { monthNum = 4; continue; }
    if (row[0].includes('MEI')) { monthNum = 5; continue; }
    if (row[0].includes('JUNI')) { monthNum = 6; continue; }
    if (row[0].includes('JULI')) { monthNum = 7; continue; }
    if (row[0].includes('AGUSTUS')) { monthNum = 8; continue; }
    if (row[0].includes('SEPTEMBER')) { monthNum = 9; continue; }
    if (row[0].includes('OKTOBER')) { monthNum = 10; continue; }
    if (row[0].includes('NOVEMBER')) { monthNum = 11; continue; }
    if (row[0].includes('DESEMBER')) { monthNum = 12; continue; }
    
    // Parse transaction rows
    const day = row[0];
    const item = row[1];
    const amount = parseAmount(row[3]);
    
    if (day && item && amount > 0) {
      const dayNum = parseInt(day.replace(/[^\d]/g, '')) || 1;
      const date = `${year}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      const category = categorizeItem(item);
      
      transactions.push({
        user_id: userId,
        txn_date: date,
        amount: amount,
        description: item,
        type: 'expense',
        category_id: categories[category] || categories['Other']
      });
    }
  }
  
  // Insert in batches
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('transactions')
      .insert(batch);
    
    if (!error) inserted += batch.length;
    else console.error('Insert error:', error);
  }
  
  return inserted;
}

async function main() {
  const [userEmail, ...filePaths] = process.argv.slice(2);
  
  if (!userEmail || filePaths.length === 0) {
    console.log('Usage: node migrate-expenses.js <user-email> <csv-file> [csv-file2] ...');
    process.exit(1);
  }
  
  const { data: listUsersData, error } = await supabase.auth.admin.listUsers({
    email: userEmail,
  });

  if (error) {
    console.error(`Error fetching user for email ${userEmail}:`, error);
    process.exit(1);
  }

  if (!listUsersData.users || listUsersData.users.length === 0) {
    console.error('User not found:', userEmail);
    process.exit(1);
  }

  const user = { user: listUsersData.users[0] };
  
  let total = 0;
  
  for (const filePath of filePaths) {
    const year = filePath.includes('2023') ? '2023' : 
                 filePath.includes('2024') ? '2024' : 
                 filePath.includes('2025') ? '2025' : '2024';
    
    console.log(`Processing ${filePath} for year ${year}...`);
    const inserted = await migrateCSV(filePath, user.user.id, year);
    console.log(`✅ ${filePath}: ${inserted} transactions`);
    total += inserted;
  }
  
  console.log(`🎉 Total migrated: ${total} transactions`);
}

main().catch(console.error);
