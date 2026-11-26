"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAP_ID, loadGoogleMaps } from "@/lib/places/google-client";
import type { Place } from "@/lib/places/types";

type Props = {
  center: { lat: number; lng: number };
  zoom?: number;
  places: Place[];
  selected: Place | null;
  onSelect: (place: Place) => void;
  onPickPoint?: (lat: number, lng: number) => void;
  onMove?: (center: { lat: number; lng: number }) => void;
  className?: string;
};

const same = (a: Place, b: Place) =>
  (a.ref && a.ref === b.ref) || (Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6);

function pinEl(active: boolean, title: string) {
  const el = document.createElement("span");
  const size = active ? 22 : 16;
  el.title = title;
  el.style.cssText =
    `display:block;width:${size}px;height:${size}px;border-radius:999px;cursor:pointer;` +
    `background:${active ? "#d9a441" : "#3a7fd5"};border:3px solid #efebe2;box-shadow:0 2px 8px rgba(0,0,0,.5)`;
  return el;
}

/** Same contract as <LeafletMap>, rendered with Google Maps (dark scheme). */
export function GoogleMap({ center, zoom = 13, places, selected, onSelect, onPickPoint, onMove, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const handlers = useRef({ onSelect, onPickPoint, onMove });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    handlers.current = { onSelect, onPickPoint, onMove };
  });

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(async () => {
        const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        await google.maps.importLibrary("marker");
        if (cancelled || !el.current) return;
        const m = new Map(el.current, {
          center,
          zoom,
          mapId: GOOGLE_MAP_ID,
          colorScheme: google.maps.ColorScheme.DARK,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        m.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) handlers.current.onPickPoint?.(e.latLng.lat(), e.latLng.lng());
        });
        m.addListener("idle", () => {
          const c = m.getCenter();
          if (c) handlers.current.onMove?.({ lat: c.lat(), lng: c.lng() });
        });
        map.current = m;
        setReady(true);
      })
      .catch((e: Error) => !cancelled && setFailed(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    markers.current.forEach((mk) => (mk.map = null));
    const all = selected && !places.some((p) => same(p, selected)) ? [...places, selected] : places;
    markers.current = all.map((p) => {
      const active = !!selected && same(p, selected);
      const mk = new google.maps.marker.AdvancedMarkerElement({
        map: m,
        position: { lat: p.lat, lng: p.lng },
        content: pinEl(active, p.name),
        title: p.name,
        zIndex: active ? 1000 : 0,
        gmpClickable: true,
      });
      mk.addListener("gmp-click", () => handlers.current.onSelect(p));
      return mk;
    });
  }, [ready, places, selected]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const c = m.getCenter();
    if (!c || Math.abs(c.lat() - center.lat) > 1e-5 || Math.abs(c.lng() - center.lng) > 1e-5) {
      m.panTo(center);
      if ((m.getZoom() ?? 0) < zoom) m.setZoom(zoom);
    }
  }, [ready, center, zoom]);

  return (
    <div className={className} style={{ position: "relative", background: "#121414" }}>
      <div ref={el} role="application" aria-label="Peta lokasi billiard" style={{ position: "absolute", inset: 0 }} />
      {failed ? (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">
          {failed}. Periksa API key Google Maps.
        </p>
      ) : null}
    </div>
  );
}
