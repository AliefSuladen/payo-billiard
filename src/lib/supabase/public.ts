import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/env";

/**
 * Cookie-less anon client for reading PUBLIC data (verified venues, open
 * sparring posts, published tournaments, leaderboard). Safe to call inside
 * `"use cache"` scopes because it never touches the request. RLS still applies.
 */
export function createPublicClient() {
  if (!isSupabaseConfigured) return null;
  return createSupabaseClient(supabaseEnv.url, supabaseEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
