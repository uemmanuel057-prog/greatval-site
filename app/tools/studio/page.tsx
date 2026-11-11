import type { Metadata } from "next";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = {
  title: "Video Studio",
  description: "A free in-browser video editor. Trim, split, add text and export for Reels, TikTok and YouTube. Nothing is uploaded.",
};

export default function StudioPage() {
  return <Studio />;
}
