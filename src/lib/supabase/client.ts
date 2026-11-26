"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/env";

/** Browser Supabase client (anon key only). Null when not configured. */
export function createClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
}
