import { toast } from "$lib/stores/toast";

export function registerServiceWorkerUpdateHandler() {
  if (!("serviceWorker" in navigator)) return () => {};

  navigator.serviceWorker
    .register("/service-worker.js")
    .then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateNotification(() =>
          registration.waiting?.postMessage({ type: "SKIP_WAITING" }),
        );
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateNotification(() =>
              newWorker.postMessage({ type: "SKIP_WAITING" }),
            );
          }
        });
      });
    })
    .catch(() => {});

  let refreshing = false;
  const handleControllerChange = () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener(
    "controllerchange",
    handleControllerChange,
  );

  return () => {
    navigator.serviceWorker.removeEventListener(
      "controllerchange",
      handleControllerChange,
    );
  };
}

function showUpdateNotification(refresh: () => void) {
  toast.info("Update available! Click to refresh.", "New Version", {
    label: "Refresh",
    callback: refresh,
  });
}
