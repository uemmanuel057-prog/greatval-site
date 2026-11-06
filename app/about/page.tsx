import type { Metadata } from "next";
import { AboutSection } from "@/components/sections/about-section";
import { NextPage } from "@/components/ui/next-page";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "About",
  description:
    "GREAT VAL is a digital creator, brand builder and entrepreneur in Nigeria, with a Computer Science foundation and a standard built on a shield and a crown.",
};

export default function AboutPage() {
  return (
    <PageShell>
      <AboutSection page />
      <NextPage current="/about" />
    </PageShell>
  );
}
