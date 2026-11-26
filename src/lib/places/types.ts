/** A place picked from the map (OpenStreetMap data). */
export type Place = {
  /** "node/123" / "way/987" (OSM) or "google:<id>"; null for a dropped pin. */
  ref: string | null;
  name: string;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
  /** Distance from the search centre, when known. */
  distanceKm?: number;
};

/** OpenStreetMap ("node/1") or Google Places ("google:ChIJ…") reference. */
export const PLACE_REF_RE = /^((node|way|relation)\/[0-9]+|google:[A-Za-z0-9_-]{10,255})$/;

export const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

/** Rough bounding box of Indonesia — places outside it are rejected. */
export const INDONESIA_BOUNDS = { minLat: -11.5, maxLat: 6.5, minLng: 94.5, maxLng: 141.5 };

export const isInIndonesia = (lat: number, lng: number) =>
  lat >= INDONESIA_BOUNDS.minLat &&
  lat <= INDONESIA_BOUNDS.maxLat &&
  lng >= INDONESIA_BOUNDS.minLng &&
  lng <= INDONESIA_BOUNDS.maxLng;

/** Monas, Jakarta — default map centre. */
export const DEFAULT_CENTER = { lat: -6.1754, lng: 106.8272 };

export const googleMapsUrl = (p: { lat: number; lng: number; name?: string | null }) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    p.name ? `${p.name} ${p.lat},${p.lng}` : `${p.lat},${p.lng}`,
  )}`;
