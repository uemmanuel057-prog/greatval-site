import { Mail } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Portrait } from "@/components/ui/portrait";
import { SocialLinks } from "@/components/ui/social-links";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Magnetic } from "@/components/motion/magnetic";
import { siteConfig } from "@/lib/site";
import { sectionSpacing } from "@/lib/section-style";
import type { SectionProps } from "@/lib/types";
import contactPhoto from "@/public/images/great-val-contact.webp";

/** Contact section: email first, then the social profiles from `lib/site.ts`. */
export function ContactSection({ page = false }: SectionProps) {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className={`relative overflow-hidden ${
        page ? sectionSpacing(true) : "bg-raised py-20 sm:py-28"
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <Container className="relative grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeading
              id="contact-title"
              as={page ? "h1" : "h2"}
              large={page}
              eyebrow="Contact"
              title="Let's build something."
              description="Whether you are a business looking for growth or technology support, or a young creator or entrepreneur learning in public, this is the place to start."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div
              data-beam="always"
              className="glass beam max-w-xl rounded-3xl p-6 sm:p-8"
            >
              <span className="flex size-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                <Mail size={22} aria-hidden="true" />
              </span>
              <p className="eyebrow mt-6">Email</p>
              <a
                href={`mailto:${siteConfig.email}`}
                className="mt-2 block break-all text-lg font-semibold text-ink underline decoration-accent-deep underline-offset-4 hover:text-accent sm:text-xl"
              >
                {siteConfig.email}
              </a>
              <p className="mt-4 text-sm text-ink-muted">
                Web projects, brand growth, media production, or
                collaboration. Send a message and I&apos;ll get back to you.
              </p>
              <div className="mt-6">
                <Magnetic>
                  <a
                    href={`mailto:${siteConfig.email}?subject=Hello%20GREAT%20VAL`}
                    data-beam="always"
                    className="btn-gold"
                  >
                    Send an email
                  </a>
                </Magnetic>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="eyebrow mb-4 mt-10">Or find me on</p>
            <SocialLinks />
          </Reveal>
        </div>

        <Reveal delay={0.2} className="mx-auto w-full max-w-xs sm:max-w-sm">
          <Portrait
            src={contactPhoto}
            alt="Black-and-white portrait of GREAT VAL in a GV cap, hand resting on his chin"
            aspect="aspect-[4/5]"
            position="object-[50%_25%]"
            sizes="(min-width: 1024px) 384px, 90vw"
            zoom={1.05}
            drift={10}
          />
        </Reveal>
      </Container>
    </section>
  );
}
