export const siteConfig = {
  name: "Payo Billiard",
  shortName: "PAYO",
  tagline: "Find Your Table. Find Your Rival. Own Your Game.",
  description:
    "Payo Billiard adalah platform digital billiard Indonesia: temukan tempat billiard di peta, buka tantangan sparring, ikuti turnamen, dan lihat ranking pemain.",
  locale: "id_ID",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export type NavItem = { title: string; href: string; description?: string };

/** Main public navigation. Every entry points to a real route. */
export const mainNav: NavItem[] = [
  { title: "Venue", href: "/venues", description: "Cari tempat billiard di peta" },
  { title: "Sparring", href: "/sparring", description: "Temukan lawan main" },
  { title: "Turnamen", href: "/tournaments", description: "Ikuti kompetisi" },
  { title: "Leaderboard", href: "/leaderboard", description: "Ranking pemain" },
];

/** Routes that require an authenticated session (checked in proxy + server). */
export const protectedPrefixes = ["/dashboard", "/admin", "/reset-password", "/sparring/new"];

/** Auth pages a signed-in user should not see. */
export const authOnlyGuestRoutes = ["/login", "/register"];
