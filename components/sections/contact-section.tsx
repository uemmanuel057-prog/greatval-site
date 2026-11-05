import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

import { siteConfig } from "@/lib/site";

/**
 * Contact section.
 * TODO: add confirmed social links here once the user provides them.
 */
export function ContactSection() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="bg-raised py-20 sm:py-28"
    >
      <Container>
        <SectionHeading
          id="contact-title"
          eyebrow="Contact"
          title="Let's build something."
          description="Whether you are a business looking for growth or technology support, or a young creator or entrepreneur learning in public, this is the place to start."
        />
        <div className="card max-w-xl">
          <p className="eyebrow mb-3">Email</p>
          <a
            href={`mailto:${siteConfig.email}`}
            className="break-all text-lg font-semibold text-ink underline decoration-accent-deep underline-offset-4 hover:text-accent"
          >
            {siteConfig.email}
          </a>
          <p className="mt-4 text-sm text-ink-muted">
            Web projects, brand growth, media production, or
            collaboration. Send a message and I&apos;ll get back to you.
          </p>
          <a
            href={`mailto:${siteConfig.email}?subject=Hello%20GREAT%20VAL`}
            className="btn-primary mt-6"
          >
            Send an email
          </a>
        </div>
      </Container>
    </section>
  );
}
