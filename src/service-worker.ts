import { build, files, version } from "$service-worker";

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener("install", (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
});

self.addEventListener("activate", (event) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

    // Only cache static build assets - NEVER cache pages or API
    if (ASSETS.includes(url.pathname)) {
      const cached = await cache.match(event.request);
      return cached || fetch(event.request);
    }

    // Everything else: network-first (pages, API, data)
    try {
      return await fetch(event.request);
    } catch {
      // Offline fallback: return app shell for navigation
      if (event.request.mode === "navigate") {
        return cache.match("/") || new Response("Offline", { status: 503 });
      }
      throw new Error("Network request failed");
    }
  }

  event.respondWith(respond());
});

// Background sync for offline transactions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  // This would integrate with your sync service
  // For now, just log that sync was attempted
  console.log("Background sync triggered");
}
