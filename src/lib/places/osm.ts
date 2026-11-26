import "server-only";
import { getSiteUrl } from "@/lib/env";
import { isInIndonesia, type Place } from "@/lib/places/types";

/**
 * OpenStreetMap lookups, done server-side so we can send an identifying
 * User-Agent, cache results and rate-limit clients, as the Nominatim and
 * Overpass usage policies ask. No API key needed.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org";
// Public Overpass instances, tried in order (the main one is often overloaded).
const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const headers = () => ({
  "User-Agent": `PayoBilliard/0.1 (+${getSiteUrl()})`,
  "Accept-Language": "id,en",
});

/* Small TTL cache to avoid hitting OSM for repeated queries. */
const cache = new Map<string, { at: number; value: Place[] }>();
const TTL = 10 * 60_000;
async function cached(key: string, load: () => Promise<Place[]>) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return value;
}

type NominatimResult = {
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
};

const cityOf = (a: Record<string, string> = {}) =>
  a.city || a.town || a.municipality || a.county || a.regency || a.city_district || a.state || null;

function fromNominatim(r: NominatimResult): Place | null {
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInIndonesia(lat, lng)) return null;
  const a = r.address ?? {};
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const name = r.name || a.amenity || a.leisure || a.shop || street || r.display_name.split(",")[0];
  return {
    ref: r.osm_type && r.osm_id ? `${r.osm_type}/${r.osm_id}` : null,
    name: name.slice(0, 120),
    address: r.display_name.slice(0, 300),
    city: cityOf(a),
    lat,
    lng,
  };
}

export function searchPlaces(query: string, near?: { lat: number; lng: number }) {
  const key = `s:${query.toLowerCase()}:${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ""}`;
  return cached(key, async () => {
    const url = new URL(`${NOMINATIM}/search`);
    url.search = new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      countrycodes: "id",
      limit: "10",
      ...(near
        ? { viewbox: `${near.lng - 0.5},${near.lat + 0.5},${near.lng + 0.5},${near.lat - 0.5}` }
        : {}),
    }).toString();
    const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data = (await res.json()) as NominatimResult[];
    return data.map(fromNominatim).filter((p): p is Place => p !== null);
  });
}

export async function reversePlace(lat: number, lng: number): Promise<Place | null> {
  const [place] = await cached(`r:${lat.toFixed(5)},${lng.toFixed(5)}`, async () => {
    const url = new URL(`${NOMINATIM}/reverse`);
    url.search = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "jsonv2",
      addressdetails: "1",
      zoom: "18",
    }).toString();
    const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const p = fromNominatim((await res.json()) as NominatimResult);
    return p ? [{ ...p, lat, lng }] : [];
  });
  return place ?? null;
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

/** Billiard / pool / snooker places mapped in OSM around a point. */
export function nearbyBilliards(lat: number, lng: number, radiusKm: number) {
  const key = `n:${lat.toFixed(3)},${lng.toFixed(3)}:${radiusKm}`;
  return cached(key, async () => {
    const r = Math.round(radiusKm * 1000);
    const q = `[out:json][timeout:20];
(
  nwr["sport"~"billiards|pool|snooker",i](around:${r},${lat},${lng});
  nwr["name"~"billiard|biliar|bilyar|biliard|billyard|snooker|pool hall",i](around:${r},${lat},${lng});
);
out center tags 80;`;
    let elements: OverpassElement[] | null = null;
    for (const endpoint of OVERPASS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { ...headers(), "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: q }),
          signal: AbortSignal.timeout(9000),
        });
        if (res.ok) {
          elements = ((await res.json()) as { elements: OverpassElement[] }).elements;
          break;
        }
      } catch {
        /* try the next instance */
      }
    }
    // Every Overpass instance failed: fall back to a Nominatim name search
    // bounded to the area (fewer results, but keeps the map useful).
    if (!elements) return nominatimBilliardsNear(lat, lng, radiusKm);

    const seen = new Set<string>();
    const places: Place[] = [];
    for (const el of elements) {
      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      const t = el.tags ?? {};
      if (pLat == null || pLng == null || !t.name) continue;
      const ref = `${el.type}/${el.id}`;
      if (seen.has(ref)) continue;
      seen.add(ref);
      const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
      const city = t["addr:city"] || t["addr:district"] || null;
      places.push({
        ref,
        name: t.name.slice(0, 120),
        address: [street, city].filter(Boolean).join(", ") || null,
        city,
        lat: pLat,
        lng: pLng,
        distanceKm: Math.round(haversineKm({ lat, lng }, { lat: pLat, lng: pLng }) * 10) / 10,
      });
    }
    return places.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)).slice(0, 50);
  });
}

async function nominatimBilliardsNear(lat: number, lng: number, radiusKm: number): Promise<Place[]> {
  const d = radiusKm / 111;
  const url = new URL(`${NOMINATIM}/search`);
  url.search = new URLSearchParams({
    q: "billiard",
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "id",
    limit: "40",
    bounded: "1",
    viewbox: `${lng - d},${lat + d},${lng + d},${lat - d}`,
  }).toString();
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  return data
    .map(fromNominatim)
    .filter((p): p is Place => p !== null)
    .map((p) => ({ ...p, distanceKm: Math.round(haversineKm({ lat, lng }, p) * 10) / 10 }))
    .filter((p) => p.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
