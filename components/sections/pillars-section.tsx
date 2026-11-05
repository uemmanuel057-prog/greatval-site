import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { pillars } from "@/lib/data/pillars";

export function PillarsSection() {
  return (
    <section
      id="pillars"
      aria-labelledby="pillars-title"
      className="border-b border-line bg-raised py-20 sm:py-28"
    >
      <Container>
        <SectionHeading
          id="pillars-title"
          eyebrow="Four pillars"
          title="What I do, and how it fits together."
        />
        <ul className="grid gap-5 sm:grid-cols-2">
          {pillars.map((pillar) => (
            <li key={pillar.id} className="card card-hover">
              <p className="font-mono text-sm text-accent">{pillar.index}</p>
              <h3 className="mt-3 text-xl sm:text-2xl">{pillar.title}</h3>
              <p className="mt-3 text-ink-muted">{pillar.summary}</p>
              <ul className="mt-5 space-y-2 border-t border-line pt-5 text-sm text-ink">
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
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
