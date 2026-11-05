import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ventures } from "@/lib/data/ventures";

export function VenturesSection() {
  return (
    <section
      id="ventures"
      aria-labelledby="ventures-title"
      className="border-b border-line py-20 sm:py-28"
    >
      <Container>
        <SectionHeading
          id="ventures-title"
          eyebrow="Ventures & work"
          title="Where the work happens."
          description="Verified roles across media, technology, talent, production, and client growth."
        />
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ventures.map((venture) => (
            <li key={venture.id} className="card card-hover flex flex-col">
              <p className="eyebrow">{venture.category}</p>
              <h3 className="mt-3 text-xl sm:text-2xl">{venture.name}</h3>
              <p className="mt-2 text-sm font-semibold text-accent">
                {venture.role}
              </p>
              <p className="mt-4 text-ink-muted">{venture.scope}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
