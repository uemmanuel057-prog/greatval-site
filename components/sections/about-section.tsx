import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export function AboutSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="border-b border-line py-20 sm:py-28"
    >
      <Container>
        <SectionHeading
          id="about-title"
          eyebrow="About"
          title="One builder, four disciplines."
        />
        <div className="grid gap-8 lg:grid-cols-2">
          <p className="text-lg text-ink-muted">
            GREAT VAL brings together media production, marketing
            strategy, entrepreneurship, and technology. Rather than
            fitting one narrow title, the work connects them: ideas
            become products, products need stories, and stories need
            systems to reach people.
          </p>
          <div className="card">
            <p className="eyebrow mb-3">Education</p>
            <p className="text-lg font-semibold">
              B.Sc. Computer Science
            </p>
            <p className="text-ink-muted">Federal University Otuoke</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
