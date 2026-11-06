import type { WebProject } from "@/lib/types";

/**
 * Websites built by GREAT VAL. URLs were supplied by the owner and
 * descriptions are based on what each live site actually shows.
 */
export const webProjects: WebProject[] = [
  {
    id: "prosper-shots",
    name: "Prosper Shots",
    category: "Photography & film studio",
    description:
      "Website for a photography, film, design, and creative training studio in Otuoke, Bayelsa.",
    url: "https://prosper-shots.vercel.app",
    highlights: [
      "Portfolio and quote requests",
      "Online booking",
      "Client gallery access",
      "Academy information",
    ],
  },
  {
    id: "model-x-africa",
    name: "Model X Africa",
    category: "Talent agency",
    description:
      "Website for a pan-African talent management agency, built around its roster and talent applications.",
    url: "https://model-x-africa.vercel.app",
    highlights: [
      "Talent roster",
      "Face of Bayelsa Universities competition",
      "Talent applications",
    ],
  },
  {
    id: "great-val",
    name: "GREAT VAL",
    category: "Personal brand & portfolio",
    description:
      "This site: a dark editorial portfolio with scroll-driven motion, glass surfaces, and a mobile-first layout.",
    url: "https://greatval-site.vercel.app",
    highlights: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
    isThisSite: true,
  },
];
