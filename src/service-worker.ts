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

    // Serve build files from cache
    if (ASSETS.includes(url.pathname)) {
      return cache.match(event.request);
    }

    // Try network first for API calls
    if (url.pathname.startsWith("/api/")) {
      try {
        const response = await fetch(event.request);
        return response;
      } catch {
        // Return offline response for API calls
        return new Response(JSON.stringify({ error: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // For pages, try cache first, then network
    try {
      const response = await cache.match(event.request);
      if (response) {
        return response;
      }
    } catch {
      // Ignore cache errors
    }

    try {
      const response = await fetch(event.request);
      if (response.status === 200) {
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      // Return cached index.html for navigation requests
      return cache.match("/");
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
