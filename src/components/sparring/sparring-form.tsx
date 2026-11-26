"use client";

import { useActionState, useEffect, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/forms/form-fields";
import { PlaceExplorer } from "@/components/maps/place-explorer";
import { Label } from "@/components/ui/label";
import { createSparringAction } from "@/lib/sparring/actions";
import { gameTypeLabel, matchFormatLabel, skillLevelLabel } from "@/lib/labels";
import type { Place } from "@/lib/places/types";
import { placesProvider } from "@/lib/places/provider";
import type { FormState } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

function Choice({
  name,
  label,
  options,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  options: Record<string, string>;
  defaultValue?: string;
  error?: string[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([value, text]) => (
          <label key={value} className="cursor-pointer">
            <input type="radio" name={name} value={value} defaultChecked={defaultValue === value} className="peer sr-only" />
            <span className="inline-flex h-9 items-center rounded-md border border-border bg-surface-2 px-3.5 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:border-foreground/30">
              {text}
            </span>
          </label>
        ))}
      </div>
      {error?.length ? <p className="mt-1.5 text-xs text-destructive">{error[0]}</p> : null}
    </fieldset>
  );
}

const jakartaDate = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

export function SparringForm({
  initialPlace,
  initialValues,
  action: submit = createSparringAction,
  submitLabel = "Buka tantangan",
}: {
  initialPlace: Place | null;
  /** Prefill when editing an existing challenge. */
  initialValues?: Record<string, string>;
  action?: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(submit, {});
  const v = state.values ?? initialValues ?? {};
  const restored: Place | null =
    v.placeName && v.lat && v.lng
      ? { ref: v.placeRef || null, name: v.placeName, address: v.placeAddress || null, city: v.city || null, lat: Number(v.lat), lng: Number(v.lng) }
      : initialPlace;
  const [place, setPlace] = useState<Place | null>(restored);
  const [city, setCity] = useState(restored?.city ?? v.city ?? "");

  async function onPick(p: Place) {
    setPlace(p);
    if (p.city) {
      setCity(p.city);
      return;
    }
    // Places from the billiard search often lack a city tag: look it up.
    try {
      const r = await placesProvider.reverse(p.lat, p.lng);
      if (r?.city) setCity(r.city);
      if (r?.address && !p.address) setPlace({ ...p, address: r.address, city: r.city });
    } catch {
      /* user can type the city */
    }
  }

  // Prefilled from the venue map without a city → look it up once.
  useEffect(() => {
    if (!place || city) return;
    let alive = true;
    placesProvider
      .reverse(place.lat, place.lng)
      .then((r) => {
        if (!alive || !r) return;
        if (r.city) setCity(r.city);
        if (r.address) setPlace((p) => (p ? { ...p, address: p.address ?? r.address, city: r.city } : p));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-8" noValidate>
      <FormMessage ok={state.ok} message={state.message} />

      <section className="grid gap-3">
        <div>
          <h2 className="display text-2xl uppercase">1. Lokasi</h2>
          <p className="text-sm text-muted-foreground">Pilih tempat billiard dari peta, cari namanya, atau klik peta untuk menandai lokasi.</p>
        </div>
        <PlaceExplorer mode="pick" value={place} onChange={(p) => void onPick(p)} />
        {errors.placeName?.length ? <p className="text-xs text-destructive">{errors.placeName[0]}</p> : null}
        <input type="hidden" name="placeName" value={place?.name ?? ""} />
        <input type="hidden" name="placeAddress" value={place?.address ?? ""} />
        <input type="hidden" name="placeRef" value={place?.ref ?? ""} />
        <input type="hidden" name="lat" value={place?.lat ?? ""} />
        <input type="hidden" name="lng" value={place?.lng ?? ""} />
        <div className="sm:max-w-xs">
          <Field label="Kota" name="city" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} autoComplete="address-level2" />
        </div>
      </section>

      <section className="grid gap-5">
        <h2 className="display text-2xl uppercase">2. Jadwal</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Tanggal" name="date" type="date" min={jakartaDate(0)} max={jakartaDate(60)} defaultValue={v.date || jakartaDate(1)} error={errors.date} />
          <Field label="Jam (WIB)" name="time" type="time" step={900} defaultValue={v.time || "19:00"} error={errors.time} />
          <div className="grid gap-1.5">
            <Label htmlFor="durationMinutes" className="text-[13px]">Durasi</Label>
            <select
              id="durationMinutes"
              name="durationMinutes"
              defaultValue={v.durationMinutes || "120"}
              className="h-11 rounded-md border border-input bg-surface-2/70 px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {[60, 90, 120, 180, 240].map((m) => (
                <option key={m} value={m}>{m / 60} jam</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        <h2 className="display text-2xl uppercase">3. Pertandingan</h2>
        <Choice name="gameType" label="Jenis permainan" options={gameTypeLabel} defaultValue={v.gameType || "eight_ball"} error={errors.gameType} />
        <Choice name="skillLevel" label="Level lawan yang dicari" options={skillLevelLabel} defaultValue={v.skillLevel} error={errors.skillLevel} />
        <Choice name="matchFormat" label="Format" options={matchFormatLabel} defaultValue={v.matchFormat || "singles"} error={errors.matchFormat} />
        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
          <Field label="Race to (opsional)" name="raceTo" inputMode="numeric" placeholder="mis. 5" defaultValue={v.raceTo} error={errors.raceTo} />
          <div className="grid gap-1.5">
            <Label htmlFor="notes" className="text-[13px]">Catatan (opsional)</Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              maxLength={500}
              defaultValue={v.notes}
              placeholder="mis. bayar meja dibagi dua, bawa stik sendiri"
              className={cn(
                "w-full rounded-md border border-input bg-surface-2/70 px-3.5 py-2.5 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
            />
          </div>
        </div>
      </section>

      <div className="sm:max-w-xs">
        <SubmitButton pendingText="Menyimpan…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
