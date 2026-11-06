import type { NavItem, SitePage } from "@/lib/types";

/**
 * Central site configuration.
 * Change the domain here once and metadata updates everywhere.
 */
export const siteConfig = {
  name: "GREAT VAL",
  tagline: "Building Ideas. Creating Value. Documenting Growth.",
  // TODO: confirm final domain (blueprint says greatval.co).
  url: "https://greatval.co",
  description:
    "GREAT VAL is a web developer, creator, marketer and strategist, and entrepreneur — building ideas, creating value, and documenting growth in public.",
  role: "Web Developer · Creator · Marketer & Strategist · Entrepreneur",
  email: "uemmanuel057@gmail.com",
} as const;

/** Every page on the site, in navigation order. */
export const sitePages: SitePage[] = [
  {
    label: "About",
    href: "/about",
    blurb: "Web development, media, marketing, and entrepreneurship, connected.",
  },
  {
    label: "Pillars",
    href: "/pillars",
    blurb: "Four pillars: creator, strategist, entrepreneur, and builder in public.",
  },
  {
    label: "Ventures",
    href: "/ventures",
    blurb: "Campus Pulse NG, EV Technology Concept, Model X Africa, and FOFC.",
  },
  {
    label: "Projects",
    href: "/projects",
    blurb: "Live websites built end to end, including this one.",
  },
  {
    label: "Skills",
    href: "/skills",
    blurb: "Next.js, React, TypeScript, ads, live broadcast, and automation.",
  },
  {
    label: "Featured",
    href: "/featured",
    blurb: "The book, the podcast, and match commentary in motion.",
  },
  {
    label: "Contact",
    href: "/contact",
    blurb: "Start a conversation about web, growth, or media.",
  },
];

export const navItems: NavItem[] = sitePages.map(({ label, href }) => ({
  label,
  href,
}));
