// Last data each page loaded, kept in memory for this tab. On the next visit
// the page shows it at once and refreshes in the background, so a click does
// not wait on Supabase. Keys start with the user id; signOut() clears it.
const cache = new Map<string, unknown>();

export function readPageCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function writePageCache<T>(key: string, value: T) {
  cache.set(key, value);
}

export function clearPageCache() {
  cache.clear();
}
