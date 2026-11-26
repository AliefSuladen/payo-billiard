import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation/auth";

/**
 * Handles every redirect back from Supabase Auth:
 *  - OAuth (Google / Apple) and email PKCE: /auth/callback?code=...&next=/dashboard
 *  - Token-hash email links:               /auth/callback?token_hash=...&type=signup|recovery|email_change
 *  - Provider errors:                       /auth/callback?error=...&error_description=...
 * Exchanges them for a session cookie and redirects to a safe internal path.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  let next = safeNext(searchParams.get("next"));
  if (type === "recovery") next = "/reset-password";

  if (searchParams.get("error")) {
    // e.g. user cancelled on Google/Apple, or the provider is not enabled.
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=not_configured", origin));
  }

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/login?error=link_invalid", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
