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
  category: "Media" | "Technology" | "Talent" | "Production";
  /** Short keywords taken directly from the verified scope. */
  tags: string[];
}

export interface ClientSupport {
  role: string;
  scope: string;
  brands: string[];
}

export interface WebProject {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Live URL supplied by the owner. */
  url: string;
  highlights: string[];
  /** True for the portfolio site itself. */
  isThisSite?: boolean;
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
