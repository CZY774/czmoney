import { createClient } from "@supabase/supabase-js";
import { json, type RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkRateLimit } from "$lib/security/ratelimit";
import { validateAndSanitize, transactionSchema } from "$lib/security/sanitize";
import { checkIdempotency, storeIdempotency } from "$lib/utils/idempotency";
import type { Database } from "$lib/types/database";

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseKey);
}

async function authenticate(request: Request) {
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

  // Check idempotency key
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) {
    const cached = await checkIdempotency(idempotencyKey);
    if (cached) {
      return json(cached, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Idempotent-Replay": "true",
        },
      });
    }
  }

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
      .insert({
        user_id: user!.id,
        txn_date: validated.txn_date,
        type: validated.type,
        amount: parseInt(validated.amount.toString()),
        category_id: validated.category_id || undefined,
        description: validated.description,
      })
      .select()
      .single();

    if (dbError) {
      return json({ error: dbError.message }, { status: 500 });
    }

    const response = { data };

    // Store for idempotency
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, response);
    }

    return json(response, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch {
    return json({ error: "Invalid input" }, { status: 400 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  const { error, user } = await authenticate(request);
  if (error) return error;

  // Check idempotency key
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) {
    const cached = await checkIdempotency(idempotencyKey);
    if (cached) {
      return json(cached, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Idempotent-Replay": "true",
        },
      });
    }
  }

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

    // First check if transaction exists and belongs to user
    const { data: existingTransaction } = await supabase!
      .from("transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user!.id)
      .single();

    if (!existingTransaction) {
      return json({ error: "Transaction not found" }, { status: 404 });
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (validated.txn_date !== undefined)
      updateData.txn_date = validated.txn_date;
    if (validated.type !== undefined) updateData.type = validated.type;
    if (validated.amount !== undefined)
      updateData.amount = parseInt(validated.amount.toString());
    if (validated.category_id !== undefined)
      updateData.category_id = validated.category_id || null;
    if (validated.description !== undefined)
      updateData.description = validated.description;

    const { data, error: dbError } = await supabase!
      .from("transactions")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user!.id)
      .select()
      .single();

    if (dbError) {
      return json({ error: dbError.message }, { status: 500 });
    }

    const response = { data };

    // Store for idempotency
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, response);
    }

    return json(response, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Transaction update error:", err);
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

  try {
    const body = await request.json();
    const { id }: { id: string } = body;

    if (!id) {
      return json({ error: "Transaction ID required" }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return json({ error: "Invalid transaction ID format" }, { status: 400 });
    }

    // First check if transaction exists and belongs to user
    const { data: existingTransaction, error: checkError } = await supabase!
      .from("transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user!.id)
      .single();

    if (checkError || !existingTransaction) {
      return json(
        { error: "Transaction not found or access denied" },
        { status: 404 },
      );
    }

    // Delete the transaction
    const { error: deleteError } = await supabase!
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return json({ error: "Failed to delete transaction" }, { status: 500 });
    }

    return json(
      { success: true, message: "Transaction deleted successfully" },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (err) {
    console.error("Transaction delete error:", err);
    return json({ error: "Invalid request data" }, { status: 400 });
  }
};
