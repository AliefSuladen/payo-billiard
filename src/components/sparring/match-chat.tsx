"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Phone, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/forms/form-fields";
import { ActionButton } from "@/components/sparring/action-controls";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/labels";
import type { FormState } from "@/lib/validation/auth";
import type { ChatMessage, MatchContact } from "@/lib/sparring/queries";

type Person = { id: string; name: string; avatar: string | null };

const timeFmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const dayFmt = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" });

const merge = (list: ChatMessage[], add: ChatMessage[]) => {
  const seen = new Set(list.map((m) => m.id));
  const next = [...list, ...add.filter((m) => !seen.has(m.id))];
  return next.sort((a, b) => a.created_at.localeCompare(b.created_at));
};

const prettyWa = (n: string) => `+62 ${n.slice(2).replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3")}`;

export function MatchChat({
  matchId,
  me,
  opponent,
  initialMessages,
  contacts,
  myPhone,
  closed,
  shareAction,
  unshareAction,
}: {
  matchId: string;
  me: Person;
  opponent: Person;
  initialMessages: ChatMessage[];
  contacts: MatchContact[];
  myPhone: string | null;
  closed: boolean;
  shareAction: (prev: FormState, fd: FormData) => Promise<FormState>;
  unshareAction: () => Promise<FormState>;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient());

  // Live updates: Realtime push, plus a slow poll in case the socket drops.
  const fetchSince = useCallback(async (since: string | null) => {
    const sb = supabase.current;
    if (!sb) return;
    let q = sb.from("match_messages").select("id, sender_id, body, created_at").eq("match_id", matchId);
    if (since) q = q.gt("created_at", since);
    const { data } = await q.order("created_at").limit(200);
    if (data?.length) setMessages((prev) => merge(prev, data as ChatMessage[]));
  }, [matchId]);

  const lastAt = messages.at(-1)?.created_at ?? null;
  const lastAtRef = useRef(lastAt);
  useEffect(() => {
    lastAtRef.current = lastAt;
  }, [lastAt]);

  useEffect(() => {
    const sb = supabase.current;
    if (!sb) return;
    let cancelled = false;
    const channel = sb.channel(`match-chat:${matchId}`);
    sb.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "match_messages", filter: `match_id=eq.${matchId}` },
          (payload) => setMessages((prev) => merge(prev, [payload.new as ChatMessage])),
        )
        .subscribe();
    });
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void fetchSince(lastAtRef.current);
    }, 15_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [matchId, fetchSince]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    const sb = supabase.current;
    if (!body || !sb || sending) return;
    setSending(true);
    const { data, error } = await sb
      .from("match_messages")
      .insert({ match_id: matchId, body })
      .select("id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error) {
      toast.error(error.code === "P0001" ? error.message : "Pesan gagal terkirim.");
      return;
    }
    setText("");
    setMessages((prev) => merge(prev, [data as ChatMessage]));
  };

  const theirWa = contacts.find((c) => c.user_id === opponent.id)?.whatsapp ?? null;
  const myWa = contacts.find((c) => c.user_id === me.id)?.whatsapp ?? null;

  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <MessageCircle className="size-4 text-primary" />
        <h2 className="display text-xl uppercase">Chat dengan {opponent.name}</h2>
      </header>

      <div ref={listRef} className="h-80 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            Belum ada pesan. Sapa lawanmu, atur jam dan meja.
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === me.id;
            const who = mine ? me : opponent;
            const day = dayFmt.format(new Date(m.created_at));
            const showDay = i === 0 || dayFmt.format(new Date(messages[i - 1].created_at)) !== day;
            return (
              <div key={m.id}>
                {showDay ? <p className="eyebrow mb-3 text-center">{day}</p> : null}
                <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <Avatar className="size-7 border border-border">
                    {who.avatar ? <AvatarImage src={who.avatar} alt="" /> : null}
                    <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">{initials(who.name)}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[78%] rounded-md px-3 py-2 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : "border border-border bg-surface-2"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 text-right font-mono text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {timeFmt.format(new Date(m.created_at))}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {closed ? (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">Pertandingan dibatalkan. Chat ditutup.</p>
      ) : (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-3">
          <label className="sr-only" htmlFor="chat-input">Tulis pesan</label>
          <textarea
            id="chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Tulis pesan…"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-input bg-surface-2/70 px-3 py-2.5 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" size="lg" disabled={sending || !text.trim()} aria-label="Kirim pesan" className="h-11">
            {sending ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
          </Button>
        </form>
      )}

      <div className="space-y-3 border-t border-border bg-background/40 px-4 py-4 text-sm">
        <p className="eyebrow flex items-center gap-1.5">
          <Phone className="size-3" /> WhatsApp
        </p>
        {theirWa ? (
          <a
            href={`https://wa.me/${theirWa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1fa855] px-4 font-medium text-white hover:bg-[#1a9049]"
          >
            Chat {opponent.name} di WhatsApp · {prettyWa(theirWa)}
          </a>
        ) : (
          <p className="text-muted-foreground">{opponent.name} belum membagikan nomor WhatsApp.</p>
        )}
        {myWa ? (
          <div className="flex flex-wrap items-center gap-3">
            <p>
              Nomor Anda <strong>{prettyWa(myWa)}</strong> terlihat oleh {opponent.name}.
            </p>
            <ActionButton size="sm" variant="outline" action={unshareAction}>
              Sembunyikan
            </ActionButton>
          </div>
        ) : (
          <ShareWaForm action={shareAction} defaultPhone={myPhone} opponentName={opponent.name} />
        )}
      </div>
    </section>
  );
}

function ShareWaForm({
  action,
  defaultPhone,
  opponentName,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaultPhone: string | null;
  opponentName: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);
  return (
    <form action={formAction} className="grid gap-2">
      {!state.ok ? <FormMessage message={state.message} /> : null}
      <label className="text-xs text-muted-foreground" htmlFor="wa-input">
        Opsional: bagikan nomor WhatsApp Anda. Hanya {opponentName} yang bisa melihatnya.
      </label>
      <div className="flex gap-2">
        <input
          id="wa-input"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          defaultValue={state.values?.whatsapp ?? defaultPhone ?? ""}
          placeholder="0812 3456 7890"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-surface-2/70 px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="shrink-0">
          <SubmitButton pendingText="Menyimpan…">Bagikan</SubmitButton>
        </div>
      </div>
    </form>
  );
}
