import fs from 'fs';

// Enhanced categorization mappings
const categoryMappings = {
  'food_drink': [
    'nasi', 'ayam', 'bakso', 'mie', 'soto', 'bubur', 'nasgor', 'warteg', 'capcay', 'rendang',
    'katsu', 'teriyaki', 'geprek', 'bakar', 'goreng', 'serundeng', 'lada hitam', 'gulai',
    'roti', 'kue', 'biskuit', 'kerupuk', 'cireng', 'cilok', 'martabak', 'bakwan', 'mendoan',
    'tempe', 'tahu', 'perkedel', 'risol', 'indomie', 'sarimi', 'energen', 'teh', 'kopi',
    'susu', 'jus', 'es', 'air', 'aqua', 'coca', 'pocari', 'cimory', 'beras', 'telur',
    'sayur', 'daging', 'ikan', 'garam', 'gula', 'minyak', 'kecap', 'saos', 'sambal'
  ],
  'transport': [
    'bensin', 'pertamax', 'ojek', 'gojek', 'grab', 'taxi', 'bus', 'angkot', 'kereta',
    'parkir', 'tol', 'service', 'bengkel', 'oli', 'ban', 'aki', 'tambal', 'cuci motor',
    'nitrogen', 'angin', 'tambah angin'
  ],
  'personal_care': [
    'shampo', 'shampoo', 'sabun', 'pasta gigi', 'sikat gigi', 'facial wash', 'masker',
    'deodorant', 'parfum', 'axe', 'nivea', 'potong', 'cukur', 'salon', 'barbershop'
  ],
  'shopping': [
    'baju', 'kaos', 'kemeja', 'celana', 'sepatu', 'sandal', 'tas', 'jam', 'kacamata',
    'topi', 'helm', 'sarung tangan', 'kaos kaki', 'underwear'
  ],
  'entertainment': [
    'bioskop', 'cinema', 'konser', 'karaoke', 'game', 'ps', 'playstation', 'badminton',
    'futsal', 'bowling', 'gym', 'renang', 'wisata', 'travel'
  ],
  'bills_utilities': [
    'listrik', 'pln', 'air', 'pdam', 'gas', 'lpg', 'wifi', 'internet', 'indihome',
    'pulsa', 'kuota', 'telkomsel', 'xl', 'indosat', 'netflix', 'spotify'
  ],
  'healthcare': [
    'dokter', 'rumah sakit', 'klinik', 'apotek', 'obat', 'vitamin', 'medical', 'checkup'
  ],
  'education': [
    'uang kuliah', 'spp', 'sks', 'semester', 'registrasi', 'uang gedung', 'buku',
    'alat tulis', 'pulpen', 'kertas', 'print', 'fotocopy', 'laptop', 'kursus'
  ],
  'housing': [
    'kos', 'kontrakan', 'sewa', 'apartemen', 'furniture', 'kasur', 'lemari', 'kipas'
  ]
};

const categoryNameMap = {
  'food_drink': 'Food & Drink',
  'transport': 'Transport', 
  'personal_care': 'Personal Care',
  'shopping': 'Shopping',
  'entertainment': 'Entertainment',
  'bills_utilities': 'Bills & Utilities',
  'healthcare': 'Healthcare',
  'education': 'Education',
  'housing': 'Housing',
  'other': 'Other'
};

function categorizeItem(description) {
  const desc = description.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        return category;
      }
    }
  }
  return 'other';
}

// Process CSV files
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
      
      // Month header
      if (line.includes(' - ') && (line.includes('jt') || line.includes('k'))) {
        const monthMatch = line.match(/^([A-Z]+)/);
        if (monthMatch) currentMonth = monthMatch[1];
        return;
      }
      
      // Skip headers
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
        const categoryName = categoryNameMap[category];
        
        allTransactions.push({
          day, item, amount: parseInt(numericAmount),
          category: categoryName, month: currentMonth, year
        });
        
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      }
    });
    
    console.log(`✅ ${filename}: processed`);
  } catch (error) {
    console.log(`❌ ${filename}: ${error.message}`);
  }
});

console.log(`\n📊 TOTAL: ${allTransactions.length} transactions auto-categorized!`);
console.log('\nBreakdown:');
Object.entries(categoryCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    const pct = ((count / allTransactions.length) * 100).toFixed(1);
    console.log(`${cat.padEnd(20)} ${count.toString().padStart(4)} (${pct}%)`);
  });

// Save results
fs.writeFileSync('categorized-transactions.json', JSON.stringify(allTransactions, null, 2));
console.log('\n💾 Saved to categorized-transactions.json');
console.log('\n🎉 Selesai! Kamu gak perlu kategorisasi manual lagi!');
