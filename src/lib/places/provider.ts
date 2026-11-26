"use client";

import { googleProvider, useGoogle } from "@/lib/places/google-client";
import type { Place } from "@/lib/places/types";

type Center = { lat: number; lng: number };

export type PlacesProvider = {
  name: "google" | "osm";
  search(q: string, near: Center): Promise<Place[]>;
  nearby(center: Center, radiusKm: number): Promise<Place[]>;
  reverse(lat: number, lng: number): Promise<Place | null>;
};

async function api(params: Record<string, string>) {
  const res = await fetch(`/api/places?${new URLSearchParams(params)}`);
  const body = (await res.json()) as { places?: Place[]; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Gagal memuat peta");
  return body.places ?? [];
}

/** OpenStreetMap via our server route (/api/places). */
const osmProvider: PlacesProvider = {
  name: "osm",
  search: (q, near) => api({ mode: "search", q, lat: String(near.lat), lng: String(near.lng) }),
  nearby: (c, radiusKm) => api({ mode: "nearby", lat: String(c.lat), lng: String(c.lng), radius: String(radiusKm) }),
  reverse: async (lat, lng) => (await api({ mode: "reverse", lat: String(lat), lng: String(lng) }))[0] ?? null,
};

/** Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set, else OpenStreetMap. */
export const placesProvider: PlacesProvider = useGoogle ? { name: "google", ...googleProvider } : osmProvider;
