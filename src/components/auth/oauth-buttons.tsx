"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { oauthSignInAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
      <path d="M16.37 12.73c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.28-1.27 3.13-2.52.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.75-4.14ZM13.79 5.09c.71-.87 1.2-2.07 1.06-3.27-1.03.04-2.28.69-3.02 1.55-.66.76-1.24 1.99-1.09 3.16 1.15.09 2.33-.58 3.05-1.44Z" />
    </svg>
  );
}

function ProviderButton({ provider, children }: { provider: "google" | "apple"; children: React.ReactNode }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("provider") === provider;
  return (
    <button
      type="submit"
      name="provider"
      value={provider}
      disabled={pending}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-60",
        provider === "apple"
          ? "bg-white text-black hover:bg-white/90"
          : "border border-border bg-surface text-foreground hover:bg-surface-2",
      )}
    >
      {mine ? <Loader2 className="size-[18px] animate-spin" /> : provider === "google" ? <GoogleIcon /> : <AppleIcon />}
      {children}
    </button>
  );
}

/**
 * "Continue with Google / Apple". One form, the clicked button's value picks
 * the provider. Apple = Apple ID, which is the iCloud account.
 */
export function OAuthButtons({
  next = "/dashboard",
  mode = "login",
}: {
  next?: string;
  mode?: "login" | "register";
}) {
  const verb = mode === "register" ? "Daftar" : "Masuk";
  return (
    <div className="grid gap-5">
      <form action={oauthSignInAction} className="grid gap-2.5 sm:grid-cols-2">
        <input type="hidden" name="next" value={next} />
        <ProviderButton provider="google">{verb} dengan Google</ProviderButton>
        <ProviderButton provider="apple">{verb} dengan Apple</ProviderButton>
      </form>
      <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        atau dengan email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
