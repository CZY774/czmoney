import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";

export async function handle({ event, resolve }) {
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase environment variables");
    return resolve(event);
  }

  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const token = event.cookies.get("sb-access-token");
  if (token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    event.locals.user = user || undefined;
  }

  return resolve(event);
}
