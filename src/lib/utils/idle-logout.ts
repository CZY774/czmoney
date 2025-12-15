import { supabase } from "$lib/services/supabase";
import { goto } from "$app/navigation";

let idleTimer: NodeJS.Timeout | null = null;
let warningTimer: NodeJS.Timeout | null = null;
let isWarningShown = false;

const IDLE_TIME = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 25 * 60 * 1000; // 25 minutes (5 min warning)

export function startIdleTimer() {
  resetIdleTimer();

  // Add event listeners for user activity
  const events = [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ];
  events.forEach((event) => {
    document.addEventListener(event, resetIdleTimer, true);
  });
}

export function stopIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  if (warningTimer) clearTimeout(warningTimer);

  const events = [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ];
  events.forEach((event) => {
    document.removeEventListener(event, resetIdleTimer, true);
  });
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  if (warningTimer) clearTimeout(warningTimer);
  isWarningShown = false;

  // Show warning at 25 minutes
  warningTimer = setTimeout(() => {
    if (!isWarningShown) {
      isWarningShown = true;
      const shouldStayLoggedIn = confirm(
        "You will be logged out in 5 minutes due to inactivity. Click OK to stay logged in.",
      );

      if (shouldStayLoggedIn) {
        resetIdleTimer(); // Reset timer if user wants to stay
      }
    }
  }, WARNING_TIME);

  // Auto logout at 30 minutes
  idleTimer = setTimeout(async () => {
    await supabase.auth.signOut();
    alert("You have been logged out due to inactivity.");
    goto(resolve("/auth/login"));
  }, IDLE_TIME);
}
