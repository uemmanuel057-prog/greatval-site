import type { Metadata } from "next";
import { ServicesSection } from "@/components/sections/services-section";
import { NextPage } from "@/components/ui/next-page";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Web development, brand consulting, ads, copywriting, video and motion graphics, live broadcast, events, and automation.",
};

export default function ServicesPage() {
  return (
    <PageShell>
      <ServicesSection page />
      <NextPage current="/services" />
    </PageShell>
  );
}
