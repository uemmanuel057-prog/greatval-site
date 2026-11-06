import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import {
  certifications,
  certificationVerifyUrl,
} from "@/lib/data/certifications";

export function CertificationsSection() {
  return (
    <section aria-labelledby="certifications-title" className="pb-20 sm:pb-28">
      <Container>
        <Reveal>
          <SectionHeading
            id="certifications-title"
            eyebrow="Credentials"
            title="Always learning."
            description="Short courses I have completed. Each certificate carries an ID you can check on the issuer's own verify page."
          />
        </Reveal>

        <ul className="grid gap-4 sm:grid-cols-2">
          {certifications.map((cert) => (
            <Reveal key={cert.id} as="li" className="h-full">
              <article className="card h-full">
                <div className="flex items-start gap-3">
                  <BadgeCheck
                    size={22}
                    className="mt-0.5 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-lg font-semibold leading-snug">
                      {cert.title}
                    </h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      {cert.issuer} · {cert.date}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-ink-muted">
                  Supports: {cert.supports}
                </p>
                <p className="mt-3 font-mono text-xs text-ink-subtle">
                  ID {cert.certificateId}
                </p>
              </article>
            </Reveal>
          ))}
        </ul>

        <Reveal>
          <a
            href={certificationVerifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-1.5 text-sm text-accent underline-offset-4 hover:underline"
          >
            Verify a certificate on aqskill.org
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </Reveal>
      </Container>
    </section>
  );
}
