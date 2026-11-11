import { writable } from "svelte/store";

// Set by "Add transaction" buttons that link to /transactions. The Transactions
// page opens its form when it sees true, then resets it. A flag rather than
// ?new=1 because svelte/no-navigation-without-resolve only accepts a bare
// resolve() as href.
export const addTransactionRequested = writable(false);

/** Click handler for links to /transactions that should open the add form */
export function requestAddTransaction(event?: MouseEvent) {
  // Ctrl, Cmd, Shift or middle click opens a new tab, which starts with a fresh
  // store. Setting the flag here would open the form on a later visit instead.
  if (
    event &&
    (event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey)
  )
    return;
  addTransactionRequested.set(true);
}
