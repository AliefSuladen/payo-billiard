import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/sparring/new", "/admin", "/auth/", "/reset-password", "/verify-email"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
