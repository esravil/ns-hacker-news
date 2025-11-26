import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Factory for creating a Supabase browser client.
 *
 * We keep this in src/lib so it can be reused across components
 * without sprinkling env logic everywhere.
 */
export function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars."
    );
  }

  return createClient(url, anonKey);
}