import Link from "next/link";
import {
  ArrowUpRight,
  Code,
  Globe,
  Layers,
  Mail,
  Rocket,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { sitePages } from "@/lib/site";

const icons: Record<string, LucideIcon> = {
  "/about": User,
  "/pillars": Layers,
  "/ventures": Rocket,
  "/projects": Globe,
  "/skills": Code,
  "/featured": Sparkles,
  "/contact": Mail,
};

/** Home-screen gateway: one card per page. */
export function ExploreSection() {
  const cards = sitePages.filter((page) => page.href !== "/contact");
  const contact = sitePages.find((page) => page.href === "/contact");

  return (
    <section
      id="explore"
      aria-labelledby="explore-title"
      className="border-b border-line py-20 sm:py-28"
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="explore-title"
            eyebrow="Explore"
            title="Pick a door."
            description="Each part of the work has its own space. Start anywhere."
          />
        </Reveal>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((page, i) => {
            const Icon = icons[page.href];
            return (
              <Reveal as="li" key={page.href} delay={(i % 3) * 0.08}>
                <TiltCard className="card beam h-full !p-0">
                  <Link
                    href={page.href}
                    className="group flex h-full flex-col rounded-2xl p-6 sm:p-7"
                  >
                    <span className="flex items-center justify-between">
                      <span className="flex size-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                        <Icon size={22} aria-hidden="true" />
                      </span>
                      <span className="font-mono text-sm text-ink-subtle">
                        0{i + 1}
                      </span>
                    </span>
                    <span className="mt-6 flex items-center gap-2 text-2xl font-bold">
                      {page.label}
                      <ArrowUpRight
                        size={20}
                        aria-hidden="true"
                        className="text-accent transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </span>
                    <span className="mt-3 text-ink-muted">{page.blurb}</span>
                  </Link>
                </TiltCard>
              </Reveal>
            );
          })}
        </ul>

        {contact ? (
          <Reveal className="mt-5">
            <Link
              href={contact.href}
              data-beam="always"
              className="glass beam group flex items-center justify-between gap-6 rounded-3xl p-6 transition-colors hover:bg-white/[0.07] sm:p-8"
            >
              <span>
                <span className="eyebrow">Contact</span>
                <span className="mt-2 block text-2xl font-bold sm:text-3xl">
                  Let&apos;s build something.
                </span>
                <span className="mt-1 block text-ink-muted">
                  {contact.blurb}
                </span>
              </span>
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-canvas transition-transform duration-300 group-hover:translate-x-1">
                <Mail size={24} aria-hidden="true" />
              </span>
            </Link>
          </Reveal>
        ) : null}
      </Container>
    </section>
  );
}
