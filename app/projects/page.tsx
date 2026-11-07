import type { Metadata } from "next";
import { ProjectsSection } from "@/components/sections/projects-section";
import { NextPage } from "@/components/ui/next-page";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Websites and apps designed and developed by GREAT VAL, including Prosper Shots, Model X Africa and the PulseLog Android beta.",
};

export default function ProjectsPage() {
  return (
    <PageShell>
      <ProjectsSection page />
      <NextPage current="/projects" />
    </PageShell>
  );
}
