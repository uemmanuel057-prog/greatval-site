import type { Metadata } from "next";
import { AboutSection } from "@/components/sections/about-section";
import { NextPage } from "@/components/ui/next-page";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "About",
  description:
    "GREAT VAL brings together web development, media production, marketing strategy, and entrepreneurship.",
};

export default function AboutPage() {
  return (
    <PageShell>
      <AboutSection page />
      <NextPage current="/about" />
    </PageShell>
  );
}
