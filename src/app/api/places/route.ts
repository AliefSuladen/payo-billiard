import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { nearbyBilliards, reversePlace, searchPlaces } from "@/lib/places/osm";
import { isInIndonesia } from "@/lib/places/types";

/**
 * GET /api/places?mode=search&q=...&lat=&lng=   → places matching a text query
 * GET /api/places?mode=nearby&lat=&lng=&radius= → billiard places around a point
 * GET /api/places?mode=reverse&lat=&lng=        → address of a dropped pin
 */
const coord = {
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
};
const schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("search"),
    q: z.string().trim().min(2).max(120),
    lat: coord.lat.optional(),
    lng: coord.lng.optional(),
  }),
  z.object({ mode: z.literal("nearby"), ...coord, radius: z.coerce.number().min(1).max(25).default(10) }),
  z.object({ mode: z.literal("reverse"), ...coord }),
]);

export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
  }

  const limit = await rateLimit("places", { limit: 30, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan, coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const p = parsed.data;
  try {
    if (p.mode === "search") {
      const near = p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : undefined;
      return NextResponse.json({ places: await searchPlaces(p.q, near) });
    }
    if (!isInIndonesia(p.lat, p.lng)) {
      return NextResponse.json({ error: "Lokasi harus di Indonesia" }, { status: 400 });
    }
    if (p.mode === "nearby") {
      return NextResponse.json({ places: await nearbyBilliards(p.lat, p.lng, p.radius) });
    }
    const place = await reversePlace(p.lat, p.lng);
    return NextResponse.json({ places: place ? [place] : [] });
  } catch {
    return NextResponse.json({ error: "Layanan peta sedang sibuk. Coba lagi." }, { status: 502 });
  }
}
