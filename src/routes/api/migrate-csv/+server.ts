import { createClient } from "@supabase/supabase-js";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample CSV data for testing (replace with actual file reading)
const sampleData = {
  "2025": [
    "JANUARI - 5.605k,,,,",
    "DAILY,,,,",
    "HARI,BARANG,JUMLAH,HARGA,KETERANGAN",
    "1st,bensin,2.89 liter,Rp35.000,",
    "1st,pulsa,30.000,Rp30.000,",
    "2nd,spaghetti carbonara,1,Rp25.500,",
    "13th,babi kecap+nasi+sambal,1,Rp22.000,",
  ],
  "2024": [
    "JANUARI - 2.02jt,,,,",
    "DAILY,,,,",
    "1st,potong,,Rp35.000,",
    "8th,beras,3kg,Rp33.000,",
    "MONTHLY,,,,",
    "8th,kos,,Rp500.000,",
  ],
};

const monthMap = {
  JANUARI: 1,
  FEBRUARI: 2,
  MARET: 3,
  APRIL: 4,
  MEI: 5,
  JUNI: 6,
  JULI: 7,
  AGUSTUS: 8,
  SEPTEMBER: 9,
  OKTOBER: 10,
  NOVEMBER: 11,
  DESEMBER: 12,
};

const categoryKeywords = {
  "Food & Drink": [
    "nasi",
    "mie",
    "telur",
    "beras",
    "makanan",
    "spaghetti",
    "bakso",
  ],
  Transport: ["bensin", "grab", "ojek"],
  "Personal Care": ["potong", "shampo", "axe"],
  "Bills & Utilities": ["kos", "wifi", "pulsa"],
  Other: ["persembahan", "babi"],
};

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  let cleanAmount = amountStr.replace(/[Rp,\s]/g, "");

  if (cleanAmount.includes("k")) {
    return Math.round(parseFloat(cleanAmount.replace("k", "")) * 1000);
  }
  if (cleanAmount.includes("jt")) {
    return Math.round(parseFloat(cleanAmount.replace("jt", "")) * 1000000);
  }

  return parseInt(cleanAmount.replace(/\./g, "")) || 0;
}

function parseDate(dayStr: string, month: string, year: number): string | null {
  if (!dayStr || !month) return null;

  const day = parseInt(dayStr.replace(/[^\d]/g, ""));
  if (isNaN(day)) return null;

  const monthNum = monthMap[month as keyof typeof monthMap];
  if (!monthNum) return null;

  return `${year}-${monthNum.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function categorizeItem(description: string): string {
  const desc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => desc.includes(keyword))) {
      return category;
    }
  }

  return "Other";
}

function parseIncomeFromHeader(headerLine: string): { month: string; amount: number } | null {
  const match = headerLine.match(/([A-Z]+)\s*-\s*([0-9.,]+)([kjtKJT]+)?/);
  if (!match) return null;

  const [, month, amount, unit] = match;
  let numericAmount = parseFloat(amount.replace(",", "."));

  if (unit) {
    const unitLower = unit.toLowerCase();
    if (unitLower.includes("k")) {
      numericAmount *= 1000;
    } else if (unitLower.includes("jt")) {
      numericAmount *= 1000000;
    }
  }

  return { month, amount: Math.round(numericAmount) };
}

export async function POST({ request }) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    let allTransactions = [];
    let allIncomeEntries = [];

    // Process sample data (in real implementation, read from CSV files)
    for (const [year, lines] of Object.entries(sampleData)) {
      let currentMonth = "";

      for (const line of lines) {
        // Check for month header
        const monthMatch = line.match(/^([A-Z]+)/);
        if (monthMatch && monthMap[monthMatch[1] as keyof typeof monthMap]) {
          currentMonth = monthMatch[1];

          // Check for income in header
          const income = parseIncomeFromHeader(line);
          if (income) {
            const incomeDate = `${year}-${monthMap[income.month as keyof typeof monthMap]
              .toString()
              .padStart(2, "0")}-01`;
            allIncomeEntries.push({
              user_id: user.id,
              txn_date: incomeDate,
              type: "income",
              amount: income.amount,
              description: "Monthly Income",
            });
          }
          continue;
        }

        // Skip headers
        if (line.includes("DAILY") || line.includes("HARI,BARANG")) continue;

        // Parse transaction line
        const parts = line.split(",");
        if (parts.length >= 4) {
          const day = parts[0];
          const description = parts[1];
          const quantity = parts[2];
          const amount = parts[3];

          if (day && description && amount && currentMonth) {
            const date = parseDate(day, currentMonth, parseInt(year));
            const amountNum = parseAmount(amount);

            if (date && amountNum > 0) {
              const category = categorizeItem(description);
              const fullDescription = `${description}${
                quantity ? ` (${quantity})` : ""
              }`;

              allTransactions.push({
                user_id: user.id,
                txn_date: date,
                type: "expense",
                amount: amountNum,
                description: fullDescription.trim(),
              });
            }
          }
        }
      }
    }

    // Import to database
    let totalImported = 0;

    // Import income entries
    if (allIncomeEntries.length > 0) {
      const { error: incomeError } = await supabase
        .from("transactions")
        .insert(allIncomeEntries);

      if (incomeError) {
        return json(
          { error: `Income import failed: ${incomeError.message}` },
          { status: 500 }
        );
      }
      totalImported += allIncomeEntries.length;
    }

    // Import expenses
    if (allTransactions.length > 0) {
      const { error: expenseError } = await supabase
        .from("transactions")
        .insert(allTransactions);

      if (expenseError) {
        return json(
          { error: `Expense import failed: ${expenseError.message}` },
          { status: 500 }
        );
      }
      totalImported += allTransactions.length;
    }

    return json({
      success: true,
      expenses: allTransactions.length,
      income: allIncomeEntries.length,
      total: totalImported,
      dateRange: `${allTransactions[0]?.txn_date} to ${
        allTransactions[allTransactions.length - 1]?.txn_date
      }`,
    });
  } catch (error: any) {
    return json({ error: error.message }, { status: 500 });
  }
}
