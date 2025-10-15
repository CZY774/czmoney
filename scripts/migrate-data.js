#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import 'dotenv/config';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Category mapping - adjust these to match your data
const CATEGORY_MAPPING = {
  'food': 'Food & Drink',
  'transport': 'Transport', 
  'shopping': 'Shopping',
  'entertainment': 'Entertainment',
  'bills': 'Bills & Utilities',
  'healthcare': 'Healthcare',
  'salary': 'Salary',
  'freelance': 'Freelance',
  'investment': 'Investment',
  'other': 'Other'
};

async function getUserCategories(userId) {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', userId);
  
  return categories.reduce((acc, cat) => {
    acc[cat.name.toLowerCase()] = cat.id;
    return acc;
  }, {});
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function parseXLSX(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

function normalizeTransaction(row, userCategories) {
  // Common field mappings - adjust based on your CSV/XLSX structure
  const date = row.date || row.Date || row.DATE || row.tanggal;
  const amount = parseFloat(row.amount || row.Amount || row.AMOUNT || row.jumlah || 0);
  const description = row.description || row.Description || row.keterangan || '';
  const category = row.category || row.Category || row.kategori || 'other';
  const type = row.type || row.Type || (amount > 0 ? 'income' : 'expense');

  // Map category name to category ID
  const categoryName = CATEGORY_MAPPING[category.toLowerCase()] || 'Other';
  const categoryId = userCategories[categoryName.toLowerCase()];

  return {
    txn_date: new Date(date).toISOString().split('T')[0],
    amount: Math.abs(amount),
    description,
    type: type.toLowerCase(),
    category_id: categoryId
  };
}

async function migrateFile(filePath, userId) {
  console.log(`Processing: ${filePath}`);
  
  let data;
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.csv') {
    data = parseCSV(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    data = parseXLSX(filePath);
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }

  const userCategories = await getUserCategories(userId);
  const transactions = [];

  for (const row of data) {
    try {
      const transaction = normalizeTransaction(row, userCategories);
      transaction.user_id = userId;
      transactions.push(transaction);
    } catch (error) {
      console.warn(`Skipping invalid row:`, row, error.message);
    }
  }

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    
    const { data: result, error } = await supabase
      .from('transactions')
      .insert(batch)
      .select('id');

    if (error) {
      console.error('Batch insert error:', error);
      continue;
    }

    inserted += result.length;
    console.log(`Inserted ${inserted}/${transactions.length} transactions`);
  }

  return inserted;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node migrate-data.js <user-email> <file-path> [file-path2] ...');
    console.log('Example: node migrate-data.js user@example.com expenses-2024.csv expenses-all.xlsx');
    process.exit(1);
  }

  const userEmail = args[0];
  const filePaths = args.slice(1);

  // Get user ID from email
  const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(userEmail);
  
  if (userError || !user) {
    console.error('User not found:', userEmail);
    process.exit(1);
  }

  console.log(`Migrating data for user: ${userEmail} (${user.user.id})`);

  let totalInserted = 0;

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    try {
      const inserted = await migrateFile(filePath, user.user.id);
      totalInserted += inserted;
      console.log(`✅ ${filePath}: ${inserted} transactions migrated`);
    } catch (error) {
      console.error(`❌ ${filePath}: ${error.message}`);
    }
  }

  console.log(`\n🎉 Migration complete! Total: ${totalInserted} transactions`);
}

main().catch(console.error);
