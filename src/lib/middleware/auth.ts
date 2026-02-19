import { createClient } from "@supabase/supabase-js";
import { json } from "@sveltejs/kit";
import type { Database } from "$lib/types/database";

// Server-side: use process.env directly (works in Vercel)
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseKey);
}

export async function authenticate(request: Request) {
  if (!supabase) {
    return {
      error: json({ error: "Service unavailable" }, { status: 503 }),
      user: null,
    };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return {
      error: json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return {
      error: json({ error: "Invalid token" }, { status: 401 }),
      user: null,
    };
  }

  return { error: null, user };
}

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }
  return supabase;
}
