// Enhanced auto-categorization for Indonesian expense items
const categoryMappings = {
  // Food & Drink - makanan dan minuman
  'food_drink': [
    // Makanan utama
    'nasi', 'ayam', 'bakso', 'mie', 'soto', 'bubur', 'nasgor', 'warteg', 'capcay', 'rendang',
    'katsu', 'teriyaki', 'geprek', 'bakar', 'goreng', 'serundeng', 'lada hitam', 'gulai',
    'padang', 'rawon', 'gudeg', 'pecel', 'gado', 'ketoprak', 'lotek', 'rujak', 'asinan',
    'sate', 'tongseng', 'opor', 'semur', 'rica', 'balado', 'sambel', 'lalapan', 'pepes',
    
    // Makanan ringan
    'roti', 'kue', 'biskuit', 'kerupuk', 'keripik', 'cireng', 'cilok', 'batagor', 'siomay',
    'pempek', 'tekwan', 'martabak', 'terang bulan', 'pancong', 'kue cubit', 'donat',
    'croissant', 'sandwich', 'burger', 'pizza', 'pasta', 'spaghetti', 'lasagna',
    'bakwan', 'mendoan', 'tempe', 'tahu', 'perkedel', 'risol', 'pastel', 'lemper',
    'arem', 'ketupat', 'lontong', 'kupat', 'burjo', 'indomie', 'mie sedap', 'sarimi',
    
    // Minuman
    'teh', 'kopi', 'susu', 'jus', 'es', 'air', 'aqua', 'coca', 'pepsi', 'sprite', 'fanta',
    'pocari', 'mizone', 'you c1000', 'lasegar', 'hydrococo', 'cimory', 'ultra milk',
    'frisian flag', 'dancow', 'bear brand', 'greenfield', 'teh pucuk', 'fruit tea',
    'floridina', 'marimas', 'nutrisari', 'energen', 'good day', 'nescafe', 'kapal api',
    'latte', 'cappuccino', 'americano', 'espresso', 'matcha', 'chocolate', 'milkshake',
    
    // Bahan makanan
    'beras', 'telur', 'daging', 'ikan', 'udang', 'cumi', 'kepiting', 'kerang',
    'sayur', 'bayam', 'kangkung', 'sawi', 'kol', 'wortel', 'kentang', 'tomat',
    'cabai', 'bawang', 'jahe', 'kunyit', 'lengkuas', 'serai', 'daun', 'bumbu',
    'garam', 'gula', 'minyak', 'mentega', 'margarin', 'santan', 'kelapa',
    'kecap', 'saos', 'sambal', 'terasi', 'petis', 'tauco', 'kecombrang'
  ],

  // Transport - transportasi
  'transport': [
    'bensin', 'pertamax', 'solar', 'premium', 'pertalite', 'shell', 'total', 'bp',
    'ojek', 'gojek', 'grab', 'uber', 'taxi', 'blue bird', 'express', 'silver',
    'bus', 'angkot', 'mikrolet', 'metromini', 'kopaja', 'patas', 'damri',
    'kereta', 'commuter', 'krl', 'mrt', 'lrt', 'transjakarta', 'busway',
    'parkir', 'tol', 'e-toll', 'e-money', 'flazz', 'brizzi', 'tapcash',
    'service', 'bengkel', 'oli', 'ban', 'aki', 'kampas', 'rem', 'filter',
    'tambal', 'cuci motor', 'nitrogen', 'angin', 'sparepart'
  ],

  // Personal Care - perawatan pribadi
  'personal_care': [
    'shampo', 'shampoo', 'conditioner', 'sabun', 'pasta gigi', 'sikat gigi',
    'odol', 'listerine', 'facial wash', 'face wash', 'cleanser', 'toner',
    'moisturizer', 'sunscreen', 'serum', 'masker', 'scrub', 'peeling',
    'deodorant', 'antiperspirant', 'parfum', 'cologne', 'body spray',
    'axe', 'rexona', 'nivea', 'vaseline', 'ponds', 'olay', 'garnier',
    'loreal', 'maybelline', 'revlon', 'wardah', 'emina', 'pixy',
    'potong', 'cukur', 'salon', 'barbershop', 'creambath', 'hair spa',
    'cat rambut', 'smoothing', 'rebonding', 'keratin', 'vitamin rambut'
  ],

  // Shopping - belanja
  'shopping': [
    'baju', 'kaos', 'kemeja', 'celana', 'rok', 'dress', 'jaket', 'sweater',
    'hoodie', 'cardigan', 'blazer', 'jas', 'dasi', 'ikat pinggang', 'sabuk',
    'sepatu', 'sandal', 'sendal', 'boots', 'sneakers', 'high heels', 'wedges',
    'tas', 'dompet', 'koper', 'ransel', 'backpack', 'handbag', 'clutch',
    'jam tangan', 'jam', 'gelang', 'kalung', 'cincin', 'anting', 'bros',
    'kacamata', 'sunglasses', 'lensa', 'frame', 'softlens', 'contact lens',
    'topi', 'helm', 'sarung tangan', 'kaos kaki', 'underwear', 'bra', 'cd'
  ],

  // Entertainment - hiburan
  'entertainment': [
    'bioskop', 'cinema', 'xxi', 'cgv', 'platinum', 'imax', 'tiket film',
    'konser', 'musik', 'festival', 'event', 'show', 'pertunjukan',
    'karaoke', 'ktv', 'nav', 'inul vista', 'happy puppy', 'nav karaoke',
    'game', 'ps', 'playstation', 'xbox', 'nintendo', 'steam', 'mobile legend',
    'pubg', 'free fire', 'genshin', 'valorant', 'dota', 'warcraft',
    'badminton', 'futsal', 'bowling', 'billiard', 'pool', 'tenis meja',
    'gym', 'fitness', 'yoga', 'zumba', 'aerobik', 'renang', 'kolam renang',
    'wisata', 'travel', 'tour', 'liburan', 'vacation', 'hotel', 'penginapan'
  ],

  // Bills & Utilities - tagihan
  'bills_utilities': [
    'listrik', 'pln', 'token listrik', 'pulsa listrik', 'meteran listrik',
    'air', 'pdam', 'pam', 'tagihan air', 'meteran air', 'sumur bor',
    'gas', 'lpg', 'elpiji', 'tabung gas', 'kompor gas', 'regulator',
    'wifi', 'internet', 'indihome', 'firstmedia', 'biznet', 'myrepublic',
    'telkom', 'speedy', 'mnc play', 'oxygen', 'iconnet', 'cbn',
    'pulsa', 'paket data', 'kuota', 'telkomsel', 'xl', 'indosat', 'tri',
    'smartfren', 'axis', 'by.u', 'im3', 'mentari', 'simpati', 'kartu halo',
    'netflix', 'disney', 'amazon prime', 'spotify', 'youtube premium',
    'apple music', 'joox', 'langit musik', 'vidio', 'viu', 'iflix'
  ],

  // Healthcare - kesehatan
  'healthcare': [
    'dokter', 'rumah sakit', 'rs', 'puskesmas', 'klinik', 'apotek', 'farmasi',
    'obat', 'vitamin', 'suplemen', 'paracetamol', 'aspirin', 'ibuprofen',
    'antibiotik', 'antasida', 'diare', 'batuk', 'pilek', 'demam', 'sakit kepala',
    'medical', 'checkup', 'konsultasi', 'terapi', 'fisioterapi', 'akupuntur',
    'vaksin', 'imunisasi', 'suntik', 'infus', 'operasi', 'rawat inap',
    'asuransi kesehatan', 'bpjs', 'mandiri inhealth', 'allianz', 'prudential'
  ],

  // Education - pendidikan
  'education': [
    'uang kuliah', 'spp', 'sks', 'semester', 'registrasi', 'daftar ulang',
    'uang gedung', 'uang pembangunan', 'wisuda', 'toga', 'ijazah', 'transkrip',
    'buku', 'novel', 'komik', 'majalah', 'koran', 'jurnal', 'ensiklopedia',
    'alat tulis', 'pulpen', 'pensil', 'penghapus', 'penggaris', 'spidol',
    'kertas', 'binder', 'map', 'folder', 'stapler', 'lem', 'gunting',
    'print', 'fotocopy', 'scan', 'jilid', 'laminating', 'spiral',
    'laptop', 'komputer', 'tablet', 'ipad', 'mouse', 'keyboard', 'headset',
    'kursus', 'les', 'bimbel', 'privat', 'tutor', 'guru', 'mentor'
  ],

  // Housing - tempat tinggal
  'housing': [
    'kos', 'kontrakan', 'sewa rumah', 'sewa kamar', 'boarding house',
    'apartemen', 'studio', 'guest house', 'homestay', 'wisma', 'asrama',
    'furniture', 'kasur', 'bantal', 'guling', 'selimut', 'sprei', 'bed cover',
    'lemari', 'meja', 'kursi', 'rak', 'laci', 'cermin', 'lampu',
    'kipas angin', 'ac', 'air conditioner', 'dispenser', 'kulkas', 'freezer',
    'rice cooker', 'magic com', 'kompor', 'wajan', 'panci', 'sendok', 'garpu'
  ]
};

// Function to categorize based on item description
function categorizeItem(description) {
  const desc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'other'; // Default category
}

// Map to Supabase category names
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

// Test function
function testCategorization() {
  const testItems = [
    'nasi goreng ayam',
    'bensin 3 liter',
    'shampo head & shoulders',
    'kaos futsal',
    'badminton',
    'wifi indihome',
    'obat batuk',
    'uang kuliah',
    'kos bulanan',
    'potong rambut'
  ];
  
  console.log('Testing categorization:');
  testItems.forEach(item => {
    const category = categorizeItem(item);
    console.log(`"${item}" -> ${categoryNameMap[category]}`);
  });
}

module.exports = { categorizeItem, categoryNameMap, testCategorization };
