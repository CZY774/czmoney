export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms = 300,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms = 300,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), ms);
    }
  };
}
