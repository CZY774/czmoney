import { createClient } from "@supabase/supabase-js";
import { json, type RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { Transaction } from "$lib/types";

// Initialize client only if environment variables exist
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export const GET: RequestHandler = async ({ url, request }) => {
  if (!supabase) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return json({ error: "Invalid token" }, { status: 401 });
  }

  const month = url.searchParams.get("month");
  const category = url.searchParams.get("category");
  const type = url.searchParams.get("type") as "income" | "expense" | null;

  let query = supabase
    .from("transactions")
    .select("*, categories(name)")
    .eq("user_id", user.id)
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

  const { data, error } = await query;

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
};

export const POST: RequestHandler = async ({ request }) => {
  if (!supabase) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json();
  const {
    txn_date,
    category_id,
    type,
    amount,
    description,
  }: Partial<Transaction> = body;

  if (!txn_date || !type || !amount || amount <= 0) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert([
      {
        user_id: user.id,
        txn_date,
        category_id,
        type,
        amount: parseInt(amount.toString()),
        description,
      },
    ])
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};

export const PUT: RequestHandler = async ({ request }) => {
  if (!supabase) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json();
  const {
    id,
    txn_date,
    category_id,
    type,
    amount,
    description,
  }: Partial<Transaction> & { id: string } = body;

  if (!id) {
    return json({ error: "Transaction ID required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({
      txn_date,
      category_id,
      type,
      amount: amount ? parseInt(amount.toString()) : undefined,
      description,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};

export const DELETE: RequestHandler = async ({ request }) => {
  if (!supabase) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json();
  const { id }: { id: string } = body;

  if (!id) {
    return json({ error: "Transaction ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};
