import type { Metadata } from "next";
import { PillarsSection } from "@/components/sections/pillars-section";
import { NextPage } from "@/components/ui/next-page";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Pillars",
  description:
    "Four pillars: creator and communicator, marketing and brand strategy, entrepreneurship and technology, and learning in public.",
};

export default function PillarsPage() {
  return (
    <PageShell>
      <PillarsSection page />
      <NextPage current="/pillars" />
    </PageShell>
  );
}
