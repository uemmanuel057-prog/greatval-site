/** Shared TypeScript interfaces for GREAT VAL site content. */

export interface NavItem {
  label: string;
  href: string;
}

export interface Pillar {
  id: string;
  index: string; // "01" – "04"
  title: string;
  summary: string;
  highlights: string[];
}

export interface Venture {
  id: string;
  name: string;
  role: string;
  scope: string;
  /** Optional short tag shown on the card, e.g. "Media" or "Technology". */
  category: "Media" | "Technology" | "Talent" | "Production" | "Growth";
}

export interface SkillGroup {
  id: string;
  title: string;
  skills: string[];
}

export type AssetStatus = "in-progress" | "coming-soon";

export interface FeaturedAsset {
  id: string;
  type: "Book" | "Podcast" | "Commentary";
  title: string;
  subtitle?: string;
  description: string;
  status: AssetStatus | "active";
  /** Only set when a real, confirmed URL exists. Never invent one. */
  href?: string;
}
