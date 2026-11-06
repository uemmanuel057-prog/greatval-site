import type { Metadata } from "next";
import { VenturesSection } from "@/components/sections/ventures-section";
import { NextPage } from "@/components/ui/next-page";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Ventures",
  description:
    "Campus Pulse NG, EV Technology Concepts, Model X Africa, and Face of FUO Connects, plus client growth support.",
};

export default function VenturesPage() {
  return (
    <PageShell>
      <VenturesSection page />
      <NextPage current="/ventures" />
    </PageShell>
  );
}
