import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";

// Tailwind class name merger
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format currency (IDR default)
export function formatCurrency(amount, currency = "IDR") {
  const value = Number(amount) || 0;

  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(value);
}

// Format date
export function formatDate(date, format = "DD MMM YYYY") {
  return dayjs(date).format(format);
}

// Get month name
export function getMonthName(monthStr) {
  return dayjs(monthStr + "-01").format("MMMM YYYY");
}

// Get current month in YYYY-MM format
export function getCurrentMonth() {
  return dayjs().format("YYYY-MM");
}

// Get previous month
export function getPreviousMonth(monthStr) {
  return dayjs(monthStr + "-01")
    .subtract(1, "month")
    .format("YYYY-MM");
}

// Calculate percentage change
export function calculatePercentChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Parse amount to integer (for storage)
export function parseAmount(value) {
  const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : Math.round(num);
}

// Group transactions by category
export function groupByCategory(transactions) {
  const grouped = {};

  transactions.forEach((txn) => {
    const key = txn.category_id || "uncategorized";
    if (!grouped[key]) {
      grouped[key] = {
        category_id: txn.category_id,
        category_name: txn.categories?.name || "Uncategorized",
        type: txn.type,
        color: txn.categories?.color || "#64748b",
        total: 0,
        count: 0,
        transactions: [],
      };
    }
    grouped[key].total += txn.amount;
    grouped[key].count += 1;
    grouped[key].transactions.push(txn);
  });

  return Object.values(grouped).sort((a, b) => b.total - a.total);
}

// Generate CSV from transactions
export function generateCSV(transactions) {
  const headers = ["Date", "Category", "Type", "Amount", "Description"];
  const rows = transactions.map((txn) => [
    formatDate(txn.txn_date),
    txn.categories?.name || "Uncategorized",
    txn.type,
    txn.amount,
    txn.description || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}

// Download CSV file
export function downloadCSV(csvContent, filename = "transactions.csv") {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Validate email
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
