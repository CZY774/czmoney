import { writable } from "svelte/store";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
  action?: { label: string; callback: () => void };
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,
    add: (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const duration = toast.duration || (toast.type === "error" ? 8000 : 5000);

      update((toasts) => [...toasts, { ...toast, id }]);

      if (duration > 0) {
        setTimeout(() => {
          update((toasts) => toasts.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    remove: (id: string) => {
      update((toasts) => toasts.filter((t) => t.id !== id));
    },
    clear: () => {
      update(() => []);
    },
  };
}

export const toastStore = createToastStore();

// Helper functions
export const toast = {
  success: (message: string, title?: string, action?: Toast["action"]) =>
    toastStore.add({ type: "success", message, title, action }),
  error: (message: string, title?: string, action?: Toast["action"]) =>
    toastStore.add({ type: "error", message, title, action }),
  warning: (message: string, title?: string, action?: Toast["action"]) =>
    toastStore.add({ type: "warning", message, title, action }),
  info: (message: string, title?: string, action?: Toast["action"]) =>
    toastStore.add({ type: "info", message, title, action }),
};
