import { writable } from "svelte/store";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,
    add: (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const duration = toast.duration || 5000;

      update((toasts) => [...toasts, { ...toast, id }]);

      setTimeout(() => {
        update((toasts) => toasts.filter((t) => t.id !== id));
      }, duration);

      return id;
    },
    remove: (id: string) => {
      update((toasts) => toasts.filter((t) => t.id !== id));
    },
    success: (message: string, title?: string) => {
      return createToastStore().add({ type: "success", message, title });
    },
    error: (message: string, title?: string) => {
      return createToastStore().add({ type: "error", message, title });
    },
    warning: (message: string, title?: string) => {
      return createToastStore().add({ type: "warning", message, title });
    },
    info: (message: string, title?: string) => {
      return createToastStore().add({ type: "info", message, title });
    },
  };
}

export const toastStore = createToastStore();

// Helper functions for easy use
export const toast = {
  success: (message: string, title?: string) =>
    toastStore.add({ type: "success", message, title }),
  error: (message: string, title?: string) =>
    toastStore.add({ type: "error", message, title }),
  warning: (message: string, title?: string) =>
    toastStore.add({ type: "warning", message, title }),
  info: (message: string, title?: string) =>
    toastStore.add({ type: "info", message, title }),
};
