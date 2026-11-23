import type { Metadata } from "next";
import localFont from "next/font/local";
import { Studio } from "@/components/studio/studio";

/** The condensed font used by the Headline caption style (Anton, SIL Open Font License, bundled so builds never fetch it). */
const headline = localFont({ src: "../../fonts/anton-latin-400.woff2", weight: "400", variable: "--font-headline", display: "swap" });

export const metadata: Metadata = {
  title: "Video Studio",
  manifest: "/studio/manifest.json",
  appleWebApp: { capable: true, title: "Val Studio", statusBarStyle: "black-translucent" },
  icons: { apple: "/studio/icon-192.png" },
  description: "A free in-browser video editor. Trim, split, add text and export for Reels, TikTok and YouTube. Nothing is uploaded.",
};

export default function StudioPage() {
  return (
    <div className={headline.variable}>
      <Studio headlineFont={headline.style.fontFamily} />
    </div>
  );
}
