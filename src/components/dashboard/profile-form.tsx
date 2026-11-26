"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Field, FormMessage, SubmitButton } from "@/components/forms/form-fields";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/lib/auth/actions";
import { gameTypeLabel, skillLevelLabel } from "@/lib/labels";
import type { FormState } from "@/lib/validation/auth";
import type { Profile } from "@/types/domain";

const selectClass =
  "h-11 w-full rounded-md border border-input bg-surface-2/70 px-3 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, {});

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  const v = (key: string, fallback: string | null | undefined) => state.values?.[key] ?? fallback ?? "";

  return (
    <form action={action} className="grid gap-6" noValidate>
      {!state.ok ? <FormMessage message={state.message} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama lengkap" name="fullName" required defaultValue={v("fullName", profile.full_name)} error={state.fieldErrors?.fullName} />
        <Field label="Username" name="username" required autoCapitalize="none" spellCheck={false} defaultValue={v("username", profile.username)} error={state.fieldErrors?.username} />
        <Field label="Kota" name="city" autoComplete="address-level2" defaultValue={v("city", profile.city)} error={state.fieldErrors?.city} />
        <Field label="Provinsi" name="province" autoComplete="address-level1" defaultValue={v("province", profile.province)} error={state.fieldErrors?.province} />
        <Field label="No. HP / WhatsApp" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="08xxxxxxxxxx" defaultValue={v("phone", profile.phone)} error={state.fieldErrors?.phone} hint="Tidak ditampilkan publik" />
        <div className="grid gap-1.5">
          <Label htmlFor="skillLevel" className="text-[13px]">Level permainan</Label>
          <select id="skillLevel" name="skillLevel" defaultValue={v("skillLevel", profile.skill_level)} className={selectClass}>
            <option value="">Pilih level</option>
            {Object.entries(skillLevelLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="preferredGame" className="text-[13px]">Permainan favorit</Label>
          <select id="preferredGame" name="preferredGame" defaultValue={v("preferredGame", profile.preferred_game)} className={selectClass}>
            <option value="">Pilih permainan</option>
            {Object.entries(gameTypeLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bio" className="text-[13px]">Bio</Label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={280}
          defaultValue={v("bio", profile.bio)}
          className="w-full rounded-md border border-input bg-surface-2/70 px-3.5 py-2.5 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Ceritakan gaya bermain Anda (maks. 280 karakter)"
        />
      </div>
      <div className="sm:max-w-xs">
        <SubmitButton pendingText="Menyimpan…">Simpan profil</SubmitButton>
      </div>
    </form>
  );
}
