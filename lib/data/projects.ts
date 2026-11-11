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
    url: "https://www.modelxafrica.com",
    highlights: [
      "Talent roster",
      "Face of Bayelsa Universities competition",
      "Talent applications",
    ],
  },
  {
    id: "pulselog",
    name: "PulseLog",
    category: "Mobile app · Productivity",
    description:
      "A daily execution tracker for creators, builders and entrepreneurs: set goals, check in daily, and watch consistency compound.",
    url: "https://github.com/uemmanuel057-prog/greatval-site/releases/download/pulselog-v1.0.0-beta/application-6aeecf4d-4669-4d04-925f-26b9249f82c1.apk",
    highlights: ["React Native", "Expo", "Daily check-ins", "Weekly targets"],
    kind: "app",
    status: "in-progress",
    platformLabel: "Android · Beta 1.0.0",
    action: { label: "Test beta version", note: "Android only · 116 MB download" },
  },
  {
    id: "evad-stars-academy",
    name: "Evad Stars Academy",
    category: "School website",
    description:
      "Website for a school in Apo Wumba, Abuja covering Early Years, Primary and Secondary education, built as a multi-page static site.",
    highlights: ["About", "Academics", "Admissions", "School life", "Contact"],
    status: "in-progress",
    url: "https://evad-stars-academy.netlify.app/",
    platformLabel: "School website · In build",
    action: { label: "Visit site", note: "Work in progress" },
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
