import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY } from "$env/static/private";
import { VITE_SUPABASE_URL } from "$env/static/public";

export async function handle({ event, resolve }) {
  // Create Supabase client with service role for server-side operations
  event.locals.supabaseServer = createClient(
    VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Get session from cookies if available
  const authHeader = event.request.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await event.locals.supabaseServer.auth.getUser(token);
    event.locals.user = user;
  }

  return resolve(event);
}
