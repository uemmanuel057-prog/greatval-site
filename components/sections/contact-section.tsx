import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

/**
 * Contact placeholder.
 * TODO: add confirmed email / social links here. No contact URL or
 * address has been verified yet, so none are shown.
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
          <p className="eyebrow mb-3">Contact details</p>
          <p className="text-ink-muted">
            Contact options are being set up. Check back soon.
          </p>
        </div>
      </Container>
    </section>
  );
}
