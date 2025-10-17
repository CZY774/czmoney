import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Auto-categorization mappings
const categoryMappings = {
  "Food & Drink": [
    "nasi",
    "ayam",
    "bakso",
    "mie",
    "soto",
    "bubur",
    "nasgor",
    "warteg",
    "capcay",
    "rendang",
    "katsu",
    "teriyaki",
    "geprek",
    "bakar",
    "goreng",
    "serundeng",
    "roti",
    "kue",
    "kerupuk",
    "cireng",
    "cilok",
    "martabak",
    "bakwan",
    "mendoan",
    "tempe",
    "tahu",
    "perkedel",
    "risol",
    "indomie",
    "sarimi",
    "energen",
    "teh",
    "kopi",
    "susu",
    "jus",
    "es",
    "air",
    "aqua",
    "coca",
    "pocari",
    "cimory",
    "beras",
    "telur",
    "sayur",
    "daging",
    "ikan",
    "garam",
    "gula",
    "minyak",
    "kecap",
    "saos",
    "sambal",
  ],
  Transport: [
    "bensin",
    "pertamax",
    "ojek",
    "gojek",
    "grab",
    "taxi",
    "bus",
    "angkot",
    "kereta",
    "parkir",
    "tol",
    "service",
    "bengkel",
    "oli",
    "ban",
    "aki",
    "tambal",
    "cuci motor",
    "nitrogen",
    "angin",
    "tambah angin",
  ],
  "Personal Care": [
    "shampo",
    "shampoo",
    "sabun",
    "pasta gigi",
    "sikat gigi",
    "facial wash",
    "masker",
    "deodorant",
    "parfum",
    "axe",
    "nivea",
    "potong",
    "cukur",
    "salon",
    "barbershop",
  ],
  Shopping: [
    "baju",
    "kaos",
    "kemeja",
    "celana",
    "sepatu",
    "sandal",
    "tas",
    "jam",
    "kacamata",
    "topi",
    "helm",
    "sarung tangan",
    "kaos kaki",
    "underwear",
  ],
  Entertainment: [
    "bioskop",
    "cinema",
    "konser",
    "karaoke",
    "game",
    "ps",
    "playstation",
    "badminton",
    "futsal",
    "bowling",
    "gym",
    "renang",
    "wisata",
    "travel",
  ],
  "Bills & Utilities": [
    "listrik",
    "pln",
    "air",
    "pdam",
    "gas",
    "lpg",
    "wifi",
    "internet",
    "indihome",
    "pulsa",
    "kuota",
    "telkomsel",
    "xl",
    "indosat",
    "netflix",
    "spotify",
  ],
  Healthcare: [
    "dokter",
    "rumah sakit",
    "klinik",
    "apotek",
    "obat",
    "vitamin",
    "medical",
    "checkup",
  ],
  Education: [
    "uang kuliah",
    "spp",
    "sks",
    "semester",
    "registrasi",
    "uang gedung",
    "buku",
    "alat tulis",
    "pulpen",
    "kertas",
    "print",
    "fotocopy",
    "laptop",
    "kursus",
  ],
  Housing: [
    "kos",
    "kontrakan",
    "sewa",
    "apartemen",
    "furniture",
    "kasur",
    "lemari",
    "kipas",
  ],
};

const monthMap = {
  JANUARI: "01",
  FEBRUARI: "02",
  MARET: "03",
  APRIL: "04",
  MEI: "05",
  JUNI: "06",
  JULI: "07",
  AGUSTUS: "08",
  SEPTEMBER: "09",
  OKTOBER: "10",
  NOVEMBER: "11",
  DESEMBER: "12",
};

function categorizeItem(description) {
  const desc = description.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) return category;
    }
  }
  return "Other";
}

async function createMissingCategories(userId, neededCategories) {
  const categoriesToCreate = [
    { name: "Personal Care", type: "expense", color: "#f59e0b" },
    { name: "Education", type: "expense", color: "#3b82f6" },
    { name: "Housing", type: "expense", color: "#6366f1" },
  ];

  for (const cat of categoriesToCreate) {
    if (neededCategories.includes(cat.name)) {
      const { error } = await supabase
        .from("categories")
        .insert([{ ...cat, user_id: userId }]);

      if (!error) {
        console.log(`✅ Created category: ${cat.name}`);
      }
    }
  }
}

async function migrateCSVToSupabase(userId) {
  console.log("🚀 Starting CSV migration with auto-categorization...\n");

  // Get user's categories
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", userId);

  if (catError) {
    console.log("❌ Error fetching categories:", catError.message);
    return;
  }

  console.log(`📋 Found ${categories.length} existing categories`);

  // Check for missing categories and create them
  const existingCategoryNames = categories.map((c) => c.name);
  const neededCategories = ["Personal Care", "Education", "Housing"];
  const missingCategories = neededCategories.filter(
    (name) => !existingCategoryNames.includes(name)
  );

  if (missingCategories.length > 0) {
    console.log(
      `🔧 Creating missing categories: ${missingCategories.join(", ")}`
    );
    await createMissingCategories(userId, missingCategories);

    // Refetch categories
    const { data: updatedCategories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", userId);
    categories.push(
      ...updatedCategories.filter((c) => missingCategories.includes(c.name))
    );
  }

  const categoryMap = {};
  categories.forEach((cat) => (categoryMap[cat.name] = cat.id));

  const csvFiles = [
    "pengeluaran - 2022.csv",
    "pengeluaran - 2023.csv",
    "pengeluaran - 2024.csv",
    "pengeluaran - 2025.csv",
  ];
  let totalTransactions = 0;
  let categoryCounts = {};
  let skippedCount = 0;

  for (const filename of csvFiles) {
    try {
      const content = fs.readFileSync(filename, "utf-8");
      const lines = content.split("\n");
      let currentMonth = "";
      const year = filename.match(/(\d{4})/)[1];
      const transactions = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Month header
        if (
          trimmed.includes(" - ") &&
          (trimmed.includes("jt") || trimmed.includes("k"))
        ) {
          const monthMatch = trimmed.match(/^([A-Z]+)/);
          if (monthMatch) currentMonth = monthMatch[1];
          continue;
        }

        // Skip headers
        if (
          trimmed.includes("HARI,BARANG") ||
          trimmed.includes("DAILY") ||
          trimmed.includes("MONTHLY")
        )
          continue;

        const cols = trimmed.split(",");
        if (cols.length >= 4 && cols[0] && cols[1] && cols[3]) {
          const day = cols[0].trim();
          const item = cols[1].trim();
          const amount = cols[3].trim();

          if (!day || !item || !amount || day === "HARI") continue;

          const numericAmount = amount.replace(/[^\d]/g, "");
          if (!numericAmount || numericAmount === "0") continue;

          // Auto-categorize
          const categoryName = categorizeItem(item);
          const categoryId = categoryMap[categoryName];

          if (!categoryId) {
            skippedCount++;
            continue;
          }

          const month = monthMap[currentMonth] || "01";
          let dayNum = day.replace(/[^\d]/g, "") || "01";

          // Fix invalid day numbers
          if (dayNum === "00" || parseInt(dayNum) > 31) {
            dayNum = "01";
          }
          dayNum = dayNum.padStart(2, "0");

          const date = `${year}-${month}-${dayNum}`;

          transactions.push({
            user_id: userId,
            txn_date: date,
            category_id: categoryId,
            type: "expense",
            amount: parseInt(numericAmount),
            description: item,
          });

          categoryCounts[categoryName] =
            (categoryCounts[categoryName] || 0) + 1;
        }
      }

      // Batch insert in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < transactions.length; i += chunkSize) {
        const chunk = transactions.slice(i, i + chunkSize);
        const { error } = await supabase.from("transactions").insert(chunk);

        if (error) {
          console.log(
            `❌ Error inserting chunk from ${filename}:`,
            error.message
          );
        }
      }

      console.log(
        `✅ ${filename}: ${transactions.length} transactions imported`
      );
      totalTransactions += transactions.length;
    } catch (error) {
      console.log(`❌ Error processing ${filename}:`, error.message);
    }
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`📊 ${totalTransactions} transactions imported`);
  console.log(`⚠️  ${skippedCount} transactions skipped (no category match)`);
  console.log("\n📈 Category breakdown:");
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      const pct = ((count / totalTransactions) * 100).toFixed(1);
      console.log(
        `  ${cat.padEnd(18)} ${count.toString().padStart(4)} (${pct}%)`
      );
    });
}

// Get user ID from command line
const userId = process.argv[2];
if (!userId) {
  console.log("❌ Please provide user ID:");
  console.log("   node scripts/migrate-to-supabase.js YOUR_USER_ID");
  process.exit(1);
}

migrateCSVToSupabase(userId).catch(console.error);
