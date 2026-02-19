import { json, type RequestHandler } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/security/ratelimit";
import { validateAndSanitize, transactionSchema } from "$lib/security/sanitize";
import {
  checkIdempotency,
  storeIdempotency,
} from "$lib/utils/idempotency.server";
import { authenticate, getSupabaseClient } from "$lib/middleware/auth";
import { handleError, AppError } from "$lib/services/errorHandler";
import { VALIDATION } from "$lib/config/constants";

export const GET: RequestHandler = async ({ url, request }) => {
  try {
    const { error, user } = await authenticate(request);
    if (error) return error;

    // Rate limit
    const { success } = await checkRateLimit(user!.id);
    if (!success) {
      throw new AppError("Too many requests", 429);
    }

    const supabase = getSupabaseClient();
    const month = url.searchParams.get("month");
    const category = url.searchParams.get("category");
    const type = url.searchParams.get("type") as "income" | "expense" | null;

    let query = supabase
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
      throw new AppError(dbError.message, 500);
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
  } catch (error) {
    return handleError(error, "GET /api/transactions");
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
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
      throw new AppError("Too many requests", 429);
    }

    const supabase = getSupabaseClient();
    const body = await request.json();
    const validated = validateAndSanitize(transactionSchema, body);

    // Additional validation
    const txnDate = new Date(validated.txn_date);
    const now = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(now.getFullYear() + 1);

    if (txnDate > maxFutureDate) {
      throw new AppError(
        "Transaction date cannot be more than 1 year in the future",
        400,
      );
    }

    const { data, error: dbError } = await supabase
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
      throw new AppError(dbError.message, 500);
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
  } catch (error) {
    return handleError(error, "POST /api/transactions");
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
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
      throw new AppError("Too many requests", 429);
    }

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      throw new AppError("Transaction ID required", 400);
    }

    const validated = validateAndSanitize(transactionSchema.partial(), rest);

    // First check if transaction exists and belongs to user
    const { data: existingTransaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user!.id)
      .single();

    if (!existingTransaction) {
      throw new AppError("Transaction not found", 404);
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

    const { data, error: dbError } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user!.id)
      .select()
      .single();

    if (dbError) {
      throw new AppError(dbError.message, 500);
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
  } catch (error) {
    return handleError(error, "PUT /api/transactions");
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { error, user } = await authenticate(request);
    if (error) return error;

    // Rate limit
    const { success } = await checkRateLimit(user!.id);
    if (!success) {
      throw new AppError("Too many requests", 429);
    }

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id }: { id: string } = body;

    if (!id) {
      throw new AppError("Transaction ID required", 400);
    }

    // Validate UUID format
    if (!VALIDATION.UUID_REGEX.test(id)) {
      throw new AppError("Invalid transaction ID format", 400);
    }

    // First check if transaction exists and belongs to user
    const { data: existingTransaction, error: checkError } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user!.id)
      .single();

    if (checkError || !existingTransaction) {
      throw new AppError("Transaction not found or access denied", 404);
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user!.id);

    if (deleteError) {
      throw new AppError("Failed to delete transaction", 500);
    }

    return json(
      { success: true, message: "Transaction deleted successfully" },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    );
  } catch (error) {
    return handleError(error, "DELETE /api/transactions");
  }
};
