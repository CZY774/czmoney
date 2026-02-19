import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";

export async function handle({ event, resolve }) {
  // Skip auth for static files
  if (
    event.url.pathname.startsWith("/icon-") ||
    event.url.pathname.endsWith(".png") ||
    event.url.pathname.endsWith(".ico")
  ) {
    return resolve(event);
  }

  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase environment variables");
    return resolve(event);
  }

  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const token = event.cookies.get("sb-access-token");
  if (token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    event.locals.user = user || undefined;
  }

  const response = await resolve(event);

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  // CSP - need unsafe-inline for SvelteKit hydration
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com; font-src 'self' data:; frame-ancestors 'none';",
  );

  return response;
}
