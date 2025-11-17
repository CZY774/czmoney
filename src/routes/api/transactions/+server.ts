import { createClient } from "@supabase/supabase-js";
import { json, type RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { Transaction } from "$lib/types";
import { checkRateLimit } from "$lib/security/ratelimit";
import { validateAndSanitize, transactionSchema } from "$lib/security/sanitize";

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

async function authenticate(request: Request) {
  if (!supabase) {
    return { error: json({ error: "Service unavailable" }, { status: 503 }), user: null };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return { error: json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);

  if (!user) {
    return { error: json({ error: "Invalid token" }, { status: 401 }), user: null };
  }

  return { error: null, user };
}

export const GET: RequestHandler = async ({ url, request }) => {
  const { error, user } = await authenticate(request);
  if (error) return error;

  // Rate limit
  const { success } = await checkRateLimit(user!.id);
  if (!success) {
    return json({ error: "Too many requests" }, { status: 429 });
  }

  const month = url.searchParams.get("month");
  const category = url.searchParams.get("category");
  const type = url.searchParams.get("type") as "income" | "expense" | null;

  let query = supabase!
    .from("transactions")
    .select("*, categories(name)")
    .eq("user_id", user!.id)
    .order("txn_date", { ascending: false });

  if (month) {
    const [year, monthNum] = month.split("-");
    const startDate = `${year}-${monthNum}-01`;
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0)
      .toISOString()
      .split("T")[0];
    query = query.gte("txn_date", startDate).lte("txn_date", endDate);
  }

  if (category) {
    query = query.eq("category_id", category);
  }

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    return json({ error: dbError.message }, { status: 500 });
  }

  return json(
    { data },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
};

export const POST: RequestHandler = async ({ request }) => {
  const { error, user } = await authenticate(request);
  if (error) return error;

  // Rate limit
  const { success } = await checkRateLimit(user!.id);
  if (!success) {
    return json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const validated = validateAndSanitize(transactionSchema, body);

    const { data, error: dbError } = await supabase!
      .from("transactions")
      .insert([
        {
          user_id: user!.id,
          ...validated,
          amount: parseInt(validated.amount.toString()),
        },
      ])
      .select()
      .single();

    if (dbError) {
      return json({ error: dbError.message }, { status: 500 });
    }

    return json(
      { data },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (err) {
    return json({ error: "Invalid input" }, { status: 400 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  const { error, user } = await authenticate(request);
  if (error) return error;

  // Rate limit
  const { success } = await checkRateLimit(user!.id);
  if (!success) {
    return json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return json({ error: "Transaction ID required" }, { status: 400 });
    }

    const validated = validateAndSanitize(transactionSchema.partial(), rest);

    const { data, error: dbError } = await supabase!
      .from("transactions")
      .update({
        ...validated,
        amount: validated.amount ? parseInt(validated.amount.toString()) : undefined,
      })
      .eq("id", id)
      .eq("user_id", user!.id)
      .select()
      .single();

    if (dbError) {
      return json({ error: dbError.message }, { status: 500 });
    }

    return json(
      { data },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (err) {
    return json({ error: "Invalid input" }, { status: 400 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  const { error, user } = await authenticate(request);
  if (error) return error;

  // Rate limit
  const { success } = await checkRateLimit(user!.id);
  if (!success) {
    return json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const { id }: { id: string } = body;

  if (!id) {
    return json({ error: "Transaction ID required" }, { status: 400 });
  }

  const { error: dbError } = await supabase!
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user!.id);

  if (dbError) {
    return json({ error: dbError.message }, { status: 500 });
  }

  return json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
};
