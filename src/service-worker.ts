import { build, files, version } from "$service-worker";

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

// Install - cache static assets only
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting(); // Force activation
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()), // Take control immediately
  );
});

// Fetch - minimal caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip Supabase API calls - always fresh
  if (url.hostname.includes("supabase.co")) return;

  // Skip local API calls - always fresh
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.open(CACHE).then((cache) => {
      // Static assets: cache-first
      if (ASSETS.includes(url.pathname)) {
        return cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              cache.put(request, response.clone());
              return response;
            }),
        );
      }

      // Pages: network-first with fast timeout
      return fetch(request, {
        signal: AbortSignal.timeout(3000),
      }).catch(
        () => cache.match("/") || new Response("Offline", { status: 503 }),
      );
    }),
  );
});
