import fs from 'fs';
import path from 'path';
import { categorizeItem, categoryNameMap } from './enhanced-categorization.js';

// Parse CSV content
function parseCSV(content) {
  const lines = content.split('\n');
  const transactions = [];
  let currentMonth = '';
  let currentYear = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check for month header (e.g., "JANUARI - 2.02jt")
    if (line.includes(' - ') && (line.includes('jt') || line.includes('k'))) {
      const monthMatch = line.match(/^([A-Z]+)/);
      if (monthMatch) {
        currentMonth = monthMatch[1];
      }
      continue;
    }
    
    // Skip headers and totals
    if (line.includes('HARI,BARANG') || line.includes('DAILY') || line.includes('MONTHLY') || line.includes('TOTAL')) {
      continue;
    }
    
    // Parse transaction line
    const cols = line.split(',');
    if (cols.length >= 4 && cols[0] && cols[1] && cols[3]) {
      const day = cols[0].trim();
      const item = cols[1].trim();
      const amount = cols[3].trim();
      
      // Skip empty or invalid entries
      if (!day || !item || !amount || day === 'HARI' || item === 'BARANG') continue;
      
      // Extract numeric amount
      const numericAmount = amount.replace(/[^\d]/g, '');
      if (!numericAmount || numericAmount === '0') continue;
      
      // Auto-categorize
      const category = categorizeItem(item);
      const categoryName = categoryNameMap[category];
      
      transactions.push({
        day,
        item,
        amount: parseInt(numericAmount),
        category: categoryName,
        month: currentMonth,
        year: currentYear,
        description: cols[4] ? cols[4].trim() : ''
      });
    }
  }
  
  return transactions;
}

// Process all CSV files
function processAllCSVs() {
  const csvFiles = [
    'pengeluaran - 2022.csv',
    'pengeluaran - 2023.csv', 
    'pengeluaran - 2024.csv',
    'pengeluaran - 2025.csv'
  ];
  
  let allTransactions = [];
  let categoryCounts = {};
  
  csvFiles.forEach(filename => {
    try {
      const year = filename.match(/(\d{4})/)[1];
      const content = fs.readFileSync(filename, 'utf-8');
      const transactions = parseCSV(content);
      
      // Add year to transactions
      transactions.forEach(t => t.year = year);
      
      allTransactions = allTransactions.concat(transactions);
      
      console.log(`✅ Processed ${filename}: ${transactions.length} transactions`);
    } catch (error) {
      console.log(`❌ Error processing ${filename}:`, error.message);
    }
  });
  
  // Count categories
  allTransactions.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });
  
  // Generate report
  console.log('\n📊 CATEGORIZATION REPORT');
  console.log('========================');
  console.log(`Total transactions: ${allTransactions.length}`);
  console.log('\nCategory breakdown:');
  
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const percentage = ((count / allTransactions.length) * 100).toFixed(1);
      console.log(`${category.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
    });
  
  // Save processed data
  const outputFile = 'processed-transactions.json';
  fs.writeFileSync(outputFile, JSON.stringify(allTransactions, null, 2));
  console.log(`\n💾 Saved to ${outputFile}`);
  
  // Generate SQL for Supabase
  generateSupabaseSQL(allTransactions);
  
  return allTransactions;
}

// Generate SQL for Supabase import
function generateSupabaseSQL(transactions) {
  let sql = `-- Auto-generated transaction import
-- Run this in Supabase SQL Editor after replacing USER_ID

`;

  // Group by month for better organization
  const monthGroups = {};
  transactions.forEach(t => {
    const monthKey = `${t.year}-${getMonthNumber(t.month)}`;
    if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
    monthGroups[monthKey].push(t);
  });

  Object.entries(monthGroups).forEach(([monthKey, monthTransactions]) => {
    sql += `\n-- ${monthKey} (${monthTransactions.length} transactions)\n`;
    
    monthTransactions.forEach(t => {
      const date = `${t.year}-${getMonthNumber(t.month).padStart(2, '0')}-${getDayNumber(t.day).padStart(2, '0')}`;
      const description = t.item.replace(/'/g, "''"); // Escape quotes
      
      sql += `INSERT INTO transactions (user_id, txn_date, category_id, type, amount, description) 
VALUES (
  'USER_ID_HERE', 
  '${date}', 
  (SELECT id FROM categories WHERE name = '${t.category}' AND user_id = 'USER_ID_HERE'), 
  'expense', 
  ${t.amount}, 
  '${description}'
);\n`;
    });
  });

  fs.writeFileSync('import-transactions.sql', sql);
  console.log('💾 Generated import-transactions.sql');
}

// Helper functions
function getMonthNumber(monthName) {
  const months = {
    'JANUARI': '01', 'FEBRUARI': '02', 'MARET': '03', 'APRIL': '04',
    'MEI': '05', 'JUNI': '06', 'JULI': '07', 'AGUSTUS': '08',
    'SEPTEMBER': '09', 'OKTOBER': '10', 'NOVEMBER': '11', 'DESEMBER': '12'
  };
  return months[monthName] || '01';
}

function getDayNumber(dayStr) {
  return dayStr.replace(/[^\d]/g, '') || '01';
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processAllCSVs();
}

export { processAllCSVs, parseCSV };
