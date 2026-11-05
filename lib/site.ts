import type { NavItem } from "@/lib/types";

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
    "GREAT VAL is a creator, marketer and strategist, entrepreneur, and technology practitioner — building ideas, creating value, and documenting growth in public.",
  role: "Creator · Marketer & Strategist · Entrepreneur · Technology Practitioner",
} as const;

export const navItems: NavItem[] = [
  { label: "About", href: "#about" },
  { label: "Pillars", href: "#pillars" },
  { label: "Ventures", href: "#ventures" },
  { label: "Skills", href: "#skills" },
  { label: "Featured", href: "#featured" },
  { label: "Contact", href: "#contact" },
];
