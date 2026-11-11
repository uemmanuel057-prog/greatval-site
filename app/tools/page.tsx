import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clapperboard } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { tools } from "@/lib/data/tools";

export const metadata: Metadata = {
  title: "Creativity Tools",
  description: "Free tools for creators, built and used by GREAT VAL. They run in your browser.",
};

export default function ToolsPage() {
  return (
    <section aria-labelledby="tools-title" className="py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="tools-title"
          as="h1"
          large
          eyebrow="Creativity tools"
          title="Tools I build and use."
          description="Free to use. No account, and nothing leaves your device."
        />
        <ul className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Reveal key={tool.id} as="li" className="h-full">
              <Link href={tool.href} className="card group flex h-full flex-col transition-colors hover:border-accent/50">
                <div className="flex items-center justify-between">
                  <Clapperboard size={24} className="text-accent" aria-hidden="true" />
                  <span className="rounded-full border border-accent/50 px-2.5 py-0.5 font-mono text-xs uppercase text-accent">
                    {tool.status}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-semibold">{tool.title}</h2>
                <p className="mt-2 text-ink-muted">{tool.description}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent">
                  Open the tool
                  <ArrowUpRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
