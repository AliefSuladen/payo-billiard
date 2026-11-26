import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/types/domain";

export type SessionUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  profile: Profile | null;
  roles: AppRole[];
};

/**
 * Data Access Layer: the single place that resolves the current user.
 * `getUser()` validates the JWT against Supabase Auth (never trust cookies
 * alone). Deduplicated per request with React `cache`.
 * Must be called inside a <Suspense> boundary, a Server Action or a Route Handler.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    // RPC: phone is not readable through the public column grants.
    supabase.rpc("get_my_profile").maybeSingle<Profile>(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    profile: profile ?? null,
    roles: (roleRows ?? []).map((r) => r.role as AppRole),
  };
});

export async function requireUser(next = "/dashboard") {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Throws a redirect unless the user has at least one of the given roles. */
export async function requireRole(roles: AppRole[], next: string) {
  const user = await requireUser(next);
  const allowed = user.roles.some((r) => roles.includes(r));
  if (!allowed) redirect("/dashboard?error=forbidden");
  return user;
}

export const hasRole = (user: SessionUser | null, role: AppRole) =>
  Boolean(user?.roles.includes(role));
