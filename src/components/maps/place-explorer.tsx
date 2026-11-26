"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Loader2, LocateFixed, MapPin, Search, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_CENTER, type Place } from "@/lib/places/types";
import { placesProvider } from "@/lib/places/provider";
import { cn } from "@/lib/utils";

const mapLoading = () => <Skeleton className="size-full rounded-none" />;
const LeafletMap = dynamic(() => import("@/components/maps/leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: mapLoading,
});
const GoogleMap = dynamic(() => import("@/components/maps/google-map").then((m) => m.GoogleMap), {
  ssr: false,
  loading: mapLoading,
});
// Google Places results must be displayed on a Google map (Maps Platform terms).
const MapView = placesProvider.name === "google" ? GoogleMap : LeafletMap;

type Center = { lat: number; lng: number };

/**
 * Map + list of billiard places (Google Maps if configured, else OpenStreetMap).
 * - "browse": explore places, `renderActions` adds buttons for the selection.
 * - "pick":   used inside a form; clicking a place or the map selects it
 *             (`onChange`). All buttons are type="button" so they never submit.
 */
export function PlaceExplorer({
  mode,
  value,
  onChange,
  renderActions,
  autoLoad = true,
  className,
}: {
  mode: "browse" | "pick";
  value?: Place | null;
  onChange?: (place: Place) => void;
  renderActions?: (place: Place) => ReactNode;
  autoLoad?: boolean;
  className?: string;
}) {
  const [center, setCenter] = useState<Center>(value ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER);
  const viewCenter = useRef<Center>(center);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(value ?? null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<null | "search" | "nearby" | "locate" | "pin">(autoLoad ? "nearby" : null);
  const [notice, setNotice] = useState<string | null>(null);

  const select = useCallback(
    (p: Place) => {
      setSelected(p);
      onChange?.(p);
    },
    [onChange],
  );

  const loadNearby = useCallback(async (c: Center) => {
    setBusy("nearby");
    setNotice(null);
    try {
      const found = await placesProvider.nearby(c, 10);
      setPlaces(found);
      if (found.length === 0) {
        setNotice("Belum ada tempat billiard yang terdata di peta sekitar sini. Cari nama tempatnya, atau klik peta untuk menandai lokasi.");
      }
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  // Initial load around the starting centre (state only changes once the request settles).
  useEffect(() => {
    if (!autoLoad) return;
    let alive = true;
    placesProvider
      .nearby(center, 10)
      .then((found) => {
        if (!alive) return;
        setPlaces(found);
        if (found.length === 0) {
          setNotice("Belum ada tempat billiard yang terdata di peta sekitar sini. Cari nama tempatnya, atau geser peta lalu tekan “Cari billiard di area ini”.");
        }
      })
      .catch((e: Error) => alive && setNotice(e.message))
      .finally(() => alive && setBusy(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch() {
    if (query.trim().length < 2) return;
    setBusy("search");
    setNotice(null);
    try {
      const c = viewCenter.current;
      const found = await placesProvider.search(query.trim(), c);
      setPlaces(found);
      if (found[0]) setCenter({ lat: found[0].lat, lng: found[0].lng });
      else setNotice("Tidak ditemukan. Coba nama tempat lain atau nama kota.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setNotice("Browser tidak mendukung deteksi lokasi.");
      return;
    }
    setBusy("locate");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const c = { lat: coords.latitude, lng: coords.longitude };
        setCenter(c);
        viewCenter.current = c;
        void loadNearby(c);
      },
      () => {
        setBusy(null);
        setNotice("Izin lokasi ditolak. Cari nama kota atau geser peta secara manual.");
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  async function dropPin(lat: number, lng: number) {
    if (mode !== "pick") return;
    setBusy("pin");
    setNotice(null);
    try {
      const p = await placesProvider.reverse(lat, lng);
      select(p ?? { ref: null, name: "Titik di peta", address: null, city: null, lat, lng });
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const choose = (p: Place) => {
    select(p);
    setCenter({ lat: p.lat, lng: p.lng });
  };

  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-surface", className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder="Cari nama tempat billiard atau kota…"
            aria-label="Cari tempat"
            className="h-10 w-full rounded-md border border-input bg-surface-2 pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => void runSearch()} disabled={!!busy}>
            {busy === "search" ? <Loader2 className="animate-spin" /> : <Search />} Cari
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={locate} disabled={!!busy} aria-label="Gunakan lokasi saya">
            {busy === "locate" ? <Loader2 className="animate-spin" /> : <LocateFixed />}
            <span className="hidden sm:inline">Lokasi saya</span>
          </Button>
        </div>
      </div>

      <div className={cn("grid", mode === "browse" && "lg:grid-cols-[minmax(300px,380px)_1fr]")}>
        {/* Map */}
        <div className={cn("relative", mode === "browse" ? "order-first h-80 lg:order-last lg:h-[560px]" : "h-72 sm:h-80")}>
          <MapView
            center={center}
            places={places}
            selected={selected}
            onSelect={choose}
            onPickPoint={mode === "pick" ? (lat, lng) => void dropPin(lat, lng) : undefined}
            onMove={(c) => (viewCenter.current = c)}
            className="size-full"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void loadNearby(viewCenter.current)}
            disabled={!!busy}
            className="absolute top-3 left-1/2 z-[500] -translate-x-1/2 bg-background! shadow-lg"
          >
            {busy === "nearby" ? <Loader2 className="animate-spin" /> : <ScanSearch />}
            Cari billiard di area ini
          </Button>
          {mode === "pick" ? (
            <p className="pointer-events-none absolute right-3 bottom-6 left-3 z-[500] text-center text-[11px] text-white/80 drop-shadow">
              {busy === "pin" ? "Mengambil alamat…" : "Tidak ada di daftar? Klik peta untuk menandai lokasi."}
            </p>
          ) : null}
        </div>

        {/* List */}
        <div className={cn("flex flex-col", mode === "browse" ? "lg:max-h-[560px]" : "max-h-72")}>
          {selected ? (
            <div className="border-b border-border bg-primary/10 p-4">
              <p className="eyebrow">{mode === "pick" ? "Lokasi dipilih" : "Dipilih"}</p>
              <p className="mt-1 font-semibold">{selected.name}</p>
              {selected.address ? <p className="mt-0.5 text-xs text-muted-foreground">{selected.address}</p> : null}
              {renderActions ? <div className="mt-3 flex flex-wrap gap-2">{renderActions(selected)}</div> : null}
            </div>
          ) : null}

          {notice ? <p className="border-b border-border p-4 text-sm text-muted-foreground">{notice}</p> : null}

          <ul className="flex-1 divide-y divide-border overflow-y-auto" aria-label="Daftar tempat">
            {busy === "nearby" && places.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="p-4">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-1/3" />
                  </li>
                ))
              : places.map((p) => {
                  const active = selected?.ref ? selected.ref === p.ref : false;
                  return (
                    <li key={p.ref ?? `${p.lat},${p.lng}`}>
                      <button
                        type="button"
                        onClick={() => choose(p)}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2",
                          active && "bg-surface-2",
                        )}
                      >
                        <MapPin className={cn("mt-0.5 size-4 shrink-0", active ? "text-brass" : "text-primary")} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          {p.address ? (
                            <span className="block truncate text-xs text-muted-foreground">{p.address}</span>
                          ) : null}
                        </span>
                        {typeof p.distanceKm === "number" ? (
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">{p.distanceKm} km</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
          </ul>
          <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            Data tempat dari {placesProvider.name === "google" ? "Google Maps" : "OpenStreetMap"}.{" "}
            {mode === "pick" ? "Belum terdata? Cari nama tempat atau tandai di peta." : "Belum terdata? Cari nama tempatnya."}
          </p>
        </div>
      </div>
    </div>
  );
}
