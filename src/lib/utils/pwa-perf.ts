// PWA Performance utilities
export function clearStaleCache() {
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name.includes("old") || name.includes("temp")) {
          caches.delete(name);
        }
      });
    });
  }
}

export function preloadCriticalData() {
  // Preload critical routes when app starts
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    const criticalRoutes = ["/transactions", "/reports", "/settings"];
    criticalRoutes.forEach((route) => {
      fetch(route, { method: "HEAD" }).catch(() => {});
    });
  }
}

export function handleVisibilityChange() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // App going to background - cleanup
      clearStaleCache();
    } else {
      // App coming to foreground - refresh data
      window.dispatchEvent(new CustomEvent("appForeground"));
    }
  });
}
