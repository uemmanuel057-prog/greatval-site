import type { NavItem, SitePage, SocialLink } from "@/lib/types";

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
  /** WhatsApp number in international format, digits only (no + or spaces). */
  whatsapp: "2348105186360",
  whatsappMessage:
    "Hi GREAT VAL, I found you through your website and I'd like to talk about a project. Here is what I need: ",
} as const;

/** Opens a WhatsApp chat with the owner, with the starter message filled in. */
export const whatsappHref = `https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(siteConfig.whatsappMessage)}`;

/** Social profiles supplied by the owner. Add new ones here and they appear everywhere. */
export const socialLinks: SocialLink[] = [
  {
    label: "LinkedIn",
    href: "https://ng.linkedin.com/in/valentine-emmanuel-ikechukwu-great-val-541314234",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/official_valentine_emmanuel",
    handle: "@official_valentine_emmanuel",
  },
  {
    label: "X",
    href: "https://x.com/GreatValcfr",
    handle: "@GreatValcfr",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1FHJH5EgKh/",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@im_just_val1",
    handle: "@im_just_val1",
  },
];

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
    blurb: "Campus Pulse NG, EV Technology Concepts, Model X Africa, and FOFC.",
  },
  {
    label: "Projects",
    href: "/projects",
    blurb: "Live websites built end to end, including this one.",
  },
  {
    label: "Services",
    href: "/services",
    blurb: "Web, brand, ads, video, live broadcast, events, and automation.",
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
    label: "Tools",
    href: "/tools",
    blurb: "Free creativity tools anyone can use, starting with a video editor.",
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
