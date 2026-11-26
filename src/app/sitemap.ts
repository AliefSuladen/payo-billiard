import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

/**
 * Static public routes. Dynamic venue / tournament / player URLs are appended
 * here when their detail pages ship (Phase 2 & 5).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const routes: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/venues", priority: 0.9, changeFrequency: "daily" },
    { path: "/sparring", priority: 0.8, changeFrequency: "daily" },
    { path: "/tournaments", priority: 0.8, changeFrequency: "daily" },
    { path: "/leaderboard", priority: 0.7, changeFrequency: "daily" },
    { path: "/register", priority: 0.5, changeFrequency: "monthly" },
    { path: "/login", priority: 0.3, changeFrequency: "monthly" },
  ];
  return routes.map((r) => ({
    url: `${base}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
