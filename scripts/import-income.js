import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const monthMap = {
  'JANUARI': '01', 'FEBRUARI': '02', 'MARET': '03', 'APRIL': '04',
  'MEI': '05', 'JUNI': '06', 'JULI': '07', 'AGUSTUS': '08', 
  'SEPTEMBER': '09', 'OKTOBER': '10', 'NOVEMBER': '11', 'DESEMBER': '12'
};

async function importIncome(userId) {
  console.log('💰 Importing income from CSV headers...\n');
  
  // Get Salary category ID
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('name', 'Salary');
  
  const salaryCategory = categories[0];
  if (!salaryCategory) {
    console.log('❌ Salary category not found');
    return;
  }
  
  const csvFiles = ['pengeluaran - 2022.csv', 'pengeluaran - 2023.csv', 'pengeluaran - 2024.csv', 'pengeluaran - 2025.csv'];
  const incomeTransactions = [];
  
  csvFiles.forEach(filename => {
    try {
      const content = fs.readFileSync(filename, 'utf-8');
      const lines = content.split('\n');
      const year = filename.match(/(\d{4})/)[1];
      
      lines.forEach(line => {
        const trimmed = line.trim();
        
        // Look for income headers like "JANUARI - 2.02jt" or "JANUARI - 5.605k"
        const incomeMatch = trimmed.match(/^([A-Z]+)\s*-\s*([\d.]+)(jt|k)/);
        if (incomeMatch) {
          const [, monthName, amount, unit] = incomeMatch;
          const month = monthMap[monthName];
          
          if (month) {
            // Convert to rupiah
            let rupiah = parseFloat(amount);
            if (unit === 'jt') rupiah *= 1000000;
            if (unit === 'k') rupiah *= 1000;
            
            const date = `${year}-${month}-01`; // First day of month
            
            incomeTransactions.push({
              user_id: userId,
              txn_date: date,
              category_id: salaryCategory.id,
              type: 'income',
              amount: Math.round(rupiah),
              description: `Monthly Income - ${monthName} ${year}`
            });
            
            console.log(`✅ ${monthName} ${year}: Rp ${rupiah.toLocaleString()}`);
          }
        }
      });
    } catch (error) {
      console.log(`❌ Error processing ${filename}:`, error.message);
    }
  });
  
  // Insert income transactions
  if (incomeTransactions.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .insert(incomeTransactions);
    
    if (error) {
      console.log('❌ Error inserting income:', error.message);
    } else {
      console.log(`\n🎉 ${incomeTransactions.length} income transactions imported!`);
      
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      console.log(`💰 Total income: Rp ${totalIncome.toLocaleString()}`);
    }
  } else {
    console.log('❌ No income data found in CSV headers');
  }
}

const userId = process.argv[2];
if (!userId) {
  console.log('❌ Please provide user ID:');
  console.log('   node scripts/import-income.js YOUR_USER_ID');
  process.exit(1);
}

importIncome(userId).catch(console.error);
