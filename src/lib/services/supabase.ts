import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { browser } from "$app/environment";
import type { Transaction, Category, Profile } from "$lib/types";

// Use import.meta.env for client-side
const supabaseUrl =
  typeof window !== "undefined"
    ? import.meta.env.VITE_SUPABASE_URL
    : process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  typeof window !== "undefined"
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    },
  },
);

export async function getSession() {
  if (!browser) return { data: { session: null } };
  return await supabase.auth.getSession();
}

export async function signUp(email: string, password: string) {
  return await supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

// Typed database operations
export async function getTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("txn_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// Client-side transaction operations (bypasses API for better performance)
export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTransaction(
  transaction: Omit<Transaction, "id" | "created_at">,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert(transaction)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) throw error;
}
