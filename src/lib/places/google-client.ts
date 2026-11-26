"use client";

import { haversineKm, isInIndonesia, type Place } from "@/lib/places/types";

/**
 * Google Maps Platform provider (browser). Active when
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set. The key is public by design and MUST
 * be restricted in Google Cloud to your domains (HTTP referrers) and to the
 * Maps JavaScript, Places (New) and Geocoding APIs.
 * Google requires Places results to be shown on a Google map, so this provider
 * is always paired with <GoogleMap>.
 */
export const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
export const useGoogle = GOOGLE_KEY.length > 0;

let loading: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (typeof window.google !== "undefined" && window.google.maps) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const cb = "__payoGoogleMapsReady";
    (window as unknown as Record<string, () => void>)[cb] = () => resolve();
    const s = document.createElement("script");
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}` +
      `&v=weekly&loading=async&language=id&region=ID&callback=${cb}`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Gagal memuat Google Maps"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

const FIELDS = ["id", "displayName", "formattedAddress", "location", "addressComponents"];

function toPlace(p: google.maps.places.Place, from?: { lat: number; lng: number }): Place | null {
  const loc = p.location;
  if (!loc) return null;
  const lat = loc.lat();
  const lng = loc.lng();
  if (!isInIndonesia(lat, lng)) return null;
  const comp = (type: string) => p.addressComponents?.find((c) => c.types.includes(type))?.longText ?? null;
  return {
    ref: p.id ? `google:${p.id}` : null,
    name: (p.displayName ?? p.formattedAddress ?? "Tempat").slice(0, 120),
    address: p.formattedAddress?.slice(0, 300) ?? null,
    city: comp("administrative_area_level_2") ?? comp("locality") ?? comp("administrative_area_level_1"),
    lat,
    lng,
    distanceKm: from ? Math.round(haversineKm(from, { lat, lng }) * 10) / 10 : undefined,
  };
}

async function textSearch(textQuery: string, center: { lat: number; lng: number }, radiusKm: number) {
  await loadGoogleMaps();
  const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
  const { places } = await Place.searchByText({
    textQuery,
    fields: FIELDS,
    locationBias: { center, radius: Math.min(radiusKm, 50) * 1000 },
    maxResultCount: 20,
    language: "id",
    region: "id",
  });
  return places.map((p) => toPlace(p, center)).filter((p): p is Place => p !== null);
}

export const googleProvider = {
  async search(q: string, near: { lat: number; lng: number }) {
    return textSearch(q, near, 30);
  },
  async nearby(center: { lat: number; lng: number }, radiusKm: number) {
    const found = await textSearch("billiard", center, radiusKm);
    return found
      .filter((p) => (p.distanceKm ?? 0) <= radiusKm)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  },
  async reverse(lat: number, lng: number): Promise<Place | null> {
    await loadGoogleMaps();
    const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
    const { results } = await new Geocoder().geocode({ location: { lat, lng }, language: "id", region: "id" });
    const r = results[0];
    if (!r) return null;
    const comp = (type: string) => r.address_components.find((c) => c.types.includes(type))?.long_name ?? null;
    return {
      ref: null,
      name: (comp("route") ?? r.formatted_address.split(",")[0]).slice(0, 120),
      address: r.formatted_address.slice(0, 300),
      city: comp("administrative_area_level_2") ?? comp("locality"),
      lat,
      lng,
    };
  },
};
