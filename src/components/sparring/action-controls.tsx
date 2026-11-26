"use client";

import { useActionState, useTransition } from "react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/forms/form-fields";
import type { FormState } from "@/lib/validation/auth";

/** A button that runs a bound server action, optionally after a confirm(). */
export function ActionButton({
  action,
  children,
  confirmText,
  variant = "default",
  size = "lg",
}: {
  action: () => Promise<FormState>;
  children: React.ReactNode;
  confirmText?: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  size?: "sm" | "lg" | "xl";
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const res = await action();
          if (res?.message) (res.ok ? toast.success : toast.error)(res.message);
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}

/** "Kirim tantangan" with an optional message. */
export function RequestForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);
  return (
    <form action={formAction} className="grid gap-3">
      {!state.ok ? <FormMessage message={state.message} /> : null}
      <label className="grid gap-1.5 text-[13px] font-medium">
        Pesan untuk pembuat tantangan (opsional)
        <textarea
          name="message"
          rows={2}
          maxLength={300}
          placeholder="mis. Saya main 8 ball tiap minggu, siap race to 5"
          className="w-full rounded-md border border-input bg-surface-2/70 px-3.5 py-2.5 text-[15px] font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <div className="sm:max-w-xs">
        <SubmitButton pendingText="Mengirim…">Kirim tantangan</SubmitButton>
      </div>
    </form>
  );
}

/** Score report: "my score" vs "opponent score"; the winner follows from it. */
export function ResultForm({
  action,
  opponentName,
  raceTo,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  opponentName: string;
  raceTo: number | null;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);
  const input =
    "h-14 w-full rounded-md border border-input bg-surface-2/70 text-center font-heading text-3xl font-bold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  return (
    <form action={formAction} className="grid gap-4">
      {!state.ok ? <FormMessage message={state.message} /> : null}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <label className="grid gap-1.5 text-center text-xs text-muted-foreground">
          Skor saya
          <input name="myScore" type="number" inputMode="numeric" min={0} max={99} required className={input} />
        </label>
        <span className="pb-3 font-heading text-2xl text-muted-foreground">–</span>
        <label className="grid gap-1.5 text-center text-xs text-muted-foreground">
          <span className="truncate">Skor {opponentName}</span>
          <input name="opponentScore" type="number" inputMode="numeric" min={0} max={99} required className={input} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        {raceTo ? `Race to ${raceTo}. ` : ""}Pemenang ditentukan dari skor. Lawan harus menerima hasil ini sebelum rating berubah.
      </p>
      <div className="sm:max-w-xs">
        <SubmitButton pendingText="Mengirim…">Ajukan hasil</SubmitButton>
      </div>
    </form>
  );
}
