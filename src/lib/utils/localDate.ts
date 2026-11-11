// Calendar dates from local date parts. toISOString() converts to UTC first, so
// east of Greenwich (Jakarta is UTC+7) it returns the previous day between local
// midnight and 07:00, and the previous month on the 1st.

/** YYYY-MM-DD in local time */
export function localDateString(date = new Date()) {
  return `${localMonthString(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM in local time */
export function localMonthString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Last day of a month as YYYY-MM-DD. month is 1 to 12. */
export function monthEndDateString(year: number, month: number) {
  return localDateString(new Date(year, month, 0));
}

/**
 * Reads a YYYY-MM-DD or YYYY-MM query param sent by the browser, so the server
 * uses the user's calendar instead of its own. Vercel runs in UTC, 7 hours
 * behind Jakarta. Returns local midnight of that day (the 1st for YYYY-MM), or
 * null when the value is missing or not a real date.
 */
export function parseLocalDate(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3] ?? 1);
  const date = new Date(year, month - 1, day);
  // new Date rolls 2026-09-31 over to 1 October; reject it instead
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
