import "server-only";
import { headers } from "next/headers";

/**
 * Fixed-window rate limiter for sensitive server actions (login, register,
 * password reset). In-memory per server instance: good enough as a first line
 * of defence on top of Supabase Auth's own rate limits. For multi-instance
 * production traffic, swap the store for Redis/Upstash (same interface).
 */
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function rateLimit(
  scope: string,
  { limit, windowMs }: { limit: number; windowMs: number },
) {
  const key = `${scope}:${await clientIp()}`;
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 10_000) {
      for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
    }
    return { ok: true as const };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false as const, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true as const };
}
