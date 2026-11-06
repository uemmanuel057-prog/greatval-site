import { pillarIcons as icons } from "@/lib/pillar-icons";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { pillars } from "@/lib/data/pillars";
import { sectionSpacing } from "@/lib/section-style";
import type { SectionProps } from "@/lib/types";

export function PillarsSection({ page = false }: SectionProps) {
  return (
    <section
      id="pillars"
      aria-labelledby="pillars-title"
      className={sectionSpacing(page, "raised")}
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="pillars-title"
            as={page ? "h1" : "h2"}
            large={page}
            eyebrow="Four pillars"
            title="What I do, and how it fits together."
          />
        </Reveal>
        <ul className="grid gap-5 sm:grid-cols-2">
          {pillars.map((pillar, i) => {
            const Icon = icons[pillar.id];
            return (
              <Reveal as="li" key={pillar.id} delay={(i % 2) * 0.1}>
                <TiltCard className="card beam h-full">
                  <div className="flex items-start justify-between">
                    <span className="flex size-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-sm text-ink-subtle">
                      {pillar.index}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl sm:text-2xl">{pillar.title}</h3>
                  <p className="mt-3 text-ink-muted">{pillar.summary}</p>
                  <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5 text-sm text-ink">
                    {pillar.highlights.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </TiltCard>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
