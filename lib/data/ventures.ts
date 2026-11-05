import type { ClientSupport, Venture } from "@/lib/types";

/** Verified ventures and roles, per the GREAT VAL Master Blueprint. */
export const ventures: Venture[] = [
  {
    id: "campus-pulse-ng",
    name: "Campus Pulse NG",
    role: "Founder & Lead Creative",
    scope:
      "Campus media platform covering youth culture and events, including event broadcast logistics.",
    category: "Media",
    tags: ["Campus media", "Youth culture", "Event coverage", "CAC registered"],
  },
  {
    id: "ev-technology-concept",
    name: "EV Technology Concept",
    role: "CEO & Lead Systems Engineer",
    scope:
      "Solar backup solutions, commercial IP CCTV surveillance networks, and hardware connectivity.",
    category: "Technology",
    tags: ["Solar backup", "IP CCTV", "Connectivity"],
  },
  {
    id: "model-x-africa",
    name: "Model X Africa",
    role: "Co-Founder & Talent Strategist",
    scope:
      "Model talent acquisition, event positioning, and digital campaign management.",
    category: "Talent",
    tags: ["Talent acquisition", "Event positioning", "Digital campaigns"],
  },
  {
    id: "fofc",
    name: "Face of FUO Connects (FOFC)",
    role: "Executive Producer & Director",
    scope:
      "Season 1 reality show live multi-cam streaming setup with 20 housemates and live vMix production.",
    category: "Production",
    tags: ["Season 1", "Live multi-cam", "vMix production", "20 housemates"],
  },
];

export const clientSupport: ClientSupport = {
  role: "Growth & Ad Strategist",
  scope: "Digital campaigns and content support for client brands.",
  brands: ["Princess Glamour Hub", "Immaculate Creations", "Arcline Interior Decor"],
};
