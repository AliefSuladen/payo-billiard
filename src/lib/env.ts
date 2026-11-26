/**
 * Public environment configuration. Only NEXT_PUBLIC_* values are read here so
 * this module is safe to import from client components. The service role key
 * is intentionally NOT referenced anywhere in the frontend.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnv = {
  url: url ?? "",
  anonKey: anonKey ?? "",
};

export const isSupabaseConfigured = Boolean(url && anonKey);

export function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
