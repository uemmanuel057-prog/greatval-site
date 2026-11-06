import type { Service } from "@/lib/types";

/**
 * Services offered. The list comes from the owner's confirmed services plus
 * skills already verified for this site. No pricing is shown on purpose.
 * Descriptions are plain statements of the work, not performance claims.
 */
export const services: Service[] = [
  {
    id: "web",
    title: "Web development",
    description:
      "Fast, mobile-first websites built end to end with Next.js, React and TypeScript, then deployed and handed over.",
    seenIn: "Prosper Shots, Model X Africa",
  },
  {
    id: "brand",
    title: "Brand consulting",
    description:
      "Positioning, visual direction and a clear story, so a brand looks and sounds like one thing everywhere.",
    seenIn: "Model X Africa",
  },
  {
    id: "marketing",
    title: "Digital marketing & ads",
    description:
      "Meta and Google Ads management plus content strategy, aimed at getting brands seen and getting responses.",
    seenIn: "Princess Glamour Hub, Immaculate Creations, Arcline Interior Decor",
  },
  {
    id: "copy",
    title: "Copywriting & ghostwriting",
    description:
      "Words for websites, ads and personal brands, written in the client's own voice.",
  },
  {
    id: "video",
    title: "Video editing & motion graphics",
    description:
      "Edits, short-form video and motion graphics that keep a story moving on every platform.",
  },
  {
    id: "broadcast",
    title: "Live broadcast production",
    description:
      "Multi-camera live streams run with vMix and OBS Studio, from setup to the live switch.",
    seenIn: "Face of FUO Connects, Season 1",
  },
  {
    id: "events",
    title: "Event planning & management",
    description:
      "Planning and running events, including the logistics, coverage and positioning around them.",
    seenIn: "Campus Pulse NG, Face of FUO Connects",
  },
  {
    id: "tech",
    title: "Automation & technology solutions",
    description:
      "Workflow automation with Make.com, the Notion API and the Claude API, plus solar backup and IP CCTV systems.",
    seenIn: "EV Technology Concepts",
  },
];
