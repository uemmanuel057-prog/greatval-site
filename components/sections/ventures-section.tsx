import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { VenturesShowcase } from "@/components/sections/ventures-showcase";
import { clientSupport, ventures } from "@/lib/data/ventures";
import { sectionSpacing } from "@/lib/section-style";
import type { SectionProps } from "@/lib/types";

export function VenturesSection({ page = false }: SectionProps) {
  return (
    <section
      id="ventures"
      aria-labelledby="ventures-title"
      className={sectionSpacing(page)}
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="ventures-title"
            as={page ? "h1" : "h2"}
            large={page}
            eyebrow="Featured ventures"
            title="Where the work happens."
            description="Verified roles across media, technology, talent, and production."
          />
        </Reveal>

        <VenturesShowcase ventures={ventures} />

        <Reveal className="mt-10">
          <div className="glass flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="eyebrow">Also supporting</p>
              <p className="mt-1 text-sm text-ink-muted">
                {clientSupport.role} · {clientSupport.scope}
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {clientSupport.brands.map((brand) => (
                <li
                  key={brand}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-ink"
                >
                  {brand}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
