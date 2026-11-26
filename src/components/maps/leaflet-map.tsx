"use client";

import { useEffect, useRef } from "react";
import type { Map as LMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "@/lib/places/types";

type Props = {
  center: { lat: number; lng: number };
  zoom?: number;
  places: Place[];
  selected: Place | null;
  onSelect: (place: Place) => void;
  /** Called when the user clicks an empty spot on the map (drop a pin). */
  onPickPoint?: (lat: number, lng: number) => void;
  onMove?: (center: { lat: number; lng: number }) => void;
  className?: string;
};

const pin = (active: boolean) =>
  `<span style="display:block;width:${active ? 22 : 16}px;height:${active ? 22 : 16}px;border-radius:999px;` +
  `background:${active ? "#d9a441" : "#3a7fd5"};border:3px solid #efebe2;box-shadow:0 2px 8px rgba(0,0,0,.5)"></span>`;

/**
 * Thin imperative wrapper around Leaflet (loaded on the client only).
 * Tiles: OpenStreetMap (darkened via CSS). Override with NEXT_PUBLIC_MAP_TILE_URL
 * (e.g. a MapTiler/Stadia URL with key) for production traffic.
 */
export function LeafletMap({ center, zoom = 13, places, selected, onSelect, onPickPoint, onMove, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const handlers = useRef({ onSelect, onPickPoint, onMove });
  useEffect(() => {
    handlers.current = { onSelect, onPickPoint, onMove };
  });

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      L.current = leaflet;
      const m = leaflet.map(el.current, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], zoom);
      leaflet
        .tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          className: "map-tiles-dark",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(m);
      layer.current = leaflet.layerGroup().addTo(m);
      m.on("click", (e) => handlers.current.onPickPoint?.(e.latlng.lat, e.latlng.lng));
      m.on("moveend", () => {
        const c = m.getCenter();
        handlers.current.onMove?.({ lat: c.lat, lng: c.lng });
      });
      map.current = m;
      // Trigger the markers effect now that the map exists.
      el.current.dispatchEvent(new Event("map-ready"));
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw markers whenever places / selection change.
  useEffect(() => {
    const draw = () => {
      const leaflet = L.current;
      if (!leaflet || !layer.current) return;
      layer.current.clearLayers();
      const all = selected && !places.some((p) => same(p, selected)) ? [...places, selected] : places;
      for (const p of all) {
        const active = !!selected && same(p, selected);
        leaflet
          .marker([p.lat, p.lng], {
            icon: leaflet.divIcon({ html: pin(active), className: "", iconSize: [22, 22], iconAnchor: [11, 11] }),
            title: p.name,
            zIndexOffset: active ? 1000 : 0,
            keyboard: true,
          })
          .on("click", (e) => {
            leaflet.DomEvent.stopPropagation(e);
            handlers.current.onSelect(p);
          })
          .addTo(layer.current);
      }
    };
    draw();
    const node = el.current;
    node?.addEventListener("map-ready", draw);
    return () => node?.removeEventListener("map-ready", draw);
  }, [places, selected]);

  // Fly to a new centre when the parent changes it.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const c = m.getCenter();
    if (Math.abs(c.lat - center.lat) > 1e-5 || Math.abs(c.lng - center.lng) > 1e-5) {
      m.flyTo([center.lat, center.lng], Math.max(m.getZoom(), zoom), { duration: 0.6 });
    }
  }, [center, zoom]);

  return (
    <div
      ref={el}
      role="application"
      aria-label="Peta lokasi billiard"
      className={className}
      style={{ background: "#121414" }}
    />
  );
}

const same = (a: Place, b: Place) =>
  (a.ref && a.ref === b.ref) || (Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6);
