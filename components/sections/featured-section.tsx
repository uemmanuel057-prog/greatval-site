import { BookOpen, Mic, Tv, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { featuredAssets } from "@/lib/data/featured";
import { sectionSpacing } from "@/lib/section-style";
import type { FeaturedAsset, SectionProps } from "@/lib/types";

const statusLabel: Record<FeaturedAsset["status"], string> = {
  "in-progress": "In progress",
  "coming-soon": "Coming soon",
  active: "Active",
};

const icons: Record<FeaturedAsset["type"], LucideIcon> = {
  Book: BookOpen,
  Podcast: Mic,
  Commentary: Tv,
};

export function FeaturedSection({ page = false }: SectionProps) {
  return (
    <section
      id="featured"
      aria-labelledby="featured-title"
      className={sectionSpacing(page)}
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="featured-title"
            as={page ? "h1" : "h2"}
            large={page}
            eyebrow="Featured"
            title="Books, podcasts & commentary."
            description="Building in public means the work is never finished. Here is what is in motion."
          />
        </Reveal>
        <ul className="grid gap-5 md:grid-cols-3">
          {featuredAssets.map((asset, i) => {
            const Icon = icons[asset.type];
            return (
              <Reveal as="li" key={asset.id} delay={i * 0.1}>
                <TiltCard className="card beam flex h-full flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="rounded-full border border-accent/40 px-3 py-1 font-mono text-xs text-accent">
                      {statusLabel[asset.status]}
                    </span>
                  </div>
                  <p className="eyebrow mt-6">{asset.type}</p>
                  <h3 className="mt-3 text-xl sm:text-2xl">{asset.title}</h3>
                  {asset.subtitle ? (
                    <p className="mt-2 text-sm text-ink-muted">
                      {asset.subtitle}
                    </p>
                  ) : null}
                  <p className="mt-4 text-ink-muted">{asset.description}</p>
                  {asset.href ? (
                    <a href={asset.href} className="btn-glass mt-6 self-start">
                      Open
                    </a>
                  ) : null}
                </TiltCard>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
