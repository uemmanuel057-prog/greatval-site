import type { FeaturedAsset } from "@/lib/types";

/**
 * Featured assets. No `href` is set anywhere because no confirmed
 * public URLs exist yet. Add real links here only once they are live.
 */
export const featuredAssets: FeaturedAsset[] = [
  {
    id: "book",
    type: "Book",
    title: "No Capital, No Noise",
    subtitle: "How I'm Building Skills, Influence & Income in Public",
    description:
      "Documenting the process of building skills, influence, and income in public.",
    status: "in-progress",
  },
  {
    id: "podcast",
    type: "Podcast",
    title: "One Brick at a Time",
    description:
      "A podcast built on one idea: progress comes one brick at a time.",
    status: "coming-soon",
  },
  {
    id: "commentary",
    type: "Commentary",
    title: "Match analysis & commentary",
    subtitle: "@greatvalfc",
    description: "Football match analysis and commentary.",
    status: "active",
  },
];
