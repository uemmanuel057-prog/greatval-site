import type { Metadata } from "next";
import { Studio } from "@/components/studio/studio";

export const metadata: Metadata = {
  title: "Video Studio",
  manifest: "/studio/manifest.json",
  appleWebApp: { capable: true, title: "Val Studio", statusBarStyle: "black-translucent" },
  icons: { apple: "/studio/icon-192.png" },
  description: "A free in-browser video editor. Trim, split, add text and export for Reels, TikTok and YouTube. Nothing is uploaded.",
};

export default function StudioPage() {
  return <Studio />;
}
