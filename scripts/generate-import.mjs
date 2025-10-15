import fs from 'fs';

const data = JSON.parse(fs.readFileSync('categorized-transactions.json', 'utf-8'));

const monthMap = {
  'JANUARI': '01', 'FEBRUARI': '02', 'MARET': '03', 'APRIL': '04',
  'MEI': '05', 'JUNI': '06', 'JULI': '07', 'AGUSTUS': '08', 
  'SEPTEMBER': '09', 'OKTOBER': '10', 'NOVEMBER': '11', 'DESEMBER': '12'
};

let sql = `-- Import ${data.length} auto-categorized transactions
-- Replace 'YOUR_USER_ID' with your actual user ID from Supabase

`;

data.forEach(t => {
  const month = monthMap[t.month] || '01';
  const day = t.day.replace(/[^\d]/g, '').padStart(2, '0') || '01';
  const date = `${t.year}-${month}-${day}`;
  const desc = t.item.replace(/'/g, "''");
  
  sql += `INSERT INTO transactions (user_id, txn_date, category_id, type, amount, description) VALUES (
  'YOUR_USER_ID',
  '${date}',
  (SELECT id FROM categories WHERE name = '${t.category}' AND user_id = 'YOUR_USER_ID'),
  'expense',
  ${t.amount},
  '${desc}'
);\n`;
});

fs.writeFileSync('import-to-supabase.sql', sql);
console.log(`✅ Generated import-to-supabase.sql with ${data.length} transactions`);
console.log('\n📋 Next steps:');
console.log('1. Open Supabase SQL Editor');
console.log('2. Replace YOUR_USER_ID with your actual user ID');
console.log('3. Run the SQL script');
console.log('4. Enjoy your categorized transactions! 🎉');
