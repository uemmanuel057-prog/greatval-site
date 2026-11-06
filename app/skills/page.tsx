import type { Metadata } from "next";
import { CertificationsSection } from "@/components/sections/certifications-section";
import { SkillsSection } from "@/components/sections/skills-section";
import { NextPage } from "@/components/ui/next-page";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Skills",
  description:
    "Web development, ads and copywriting, live broadcast production, and automation.",
};

export default function SkillsPage() {
  return (
    <PageShell>
      <SkillsSection page />
      <CertificationsSection />
      <NextPage current="/skills" />
    </PageShell>
  );
}
