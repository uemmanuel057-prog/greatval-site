import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clapperboard,
  Code,
  Compass,
  Cpu,
  Megaphone,
  PenLine,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { services } from "@/lib/data/services";
import { sectionSpacing } from "@/lib/section-style";
import type { SectionProps } from "@/lib/types";

const icons: Record<string, LucideIcon> = {
  web: Code,
  brand: Compass,
  marketing: Megaphone,
  copy: PenLine,
  video: Clapperboard,
  broadcast: Radio,
  events: CalendarDays,
  tech: Cpu,
};

export function ServicesSection({ page = false }: SectionProps) {
  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className={sectionSpacing(page)}
    >
      <Container>
        <Reveal>
          <SectionHeading
            id="services-title"
            as={page ? "h1" : "h2"}
            large={page}
            eyebrow="Services"
            title="How I can help."
            description="Eight ways to work together, from a website to a live broadcast. Every project starts with a conversation, so there is no fixed price list."
          />
        </Reveal>

        <ul className="grid gap-5 sm:grid-cols-2">
          {services.map((service, i) => {
            const Icon = icons[service.id];
            return (
              <Reveal as="li" key={service.id} delay={(i % 2) * 0.08}>
                <TiltCard className="card beam h-full">
                  <div className="flex items-start justify-between">
                    <span className="flex size-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-sm text-ink-subtle">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl sm:text-2xl">{service.title}</h3>
                  <p className="mt-3 text-ink-muted">{service.description}</p>
                  {service.seenIn ? (
                    <p className="mt-5 border-t border-white/10 pt-4 text-sm text-ink-muted">
                      <span className="font-mono text-xs uppercase tracking-widest text-accent">
                        Seen in
                      </span>
                      <span className="mt-1 block text-ink">
                        {service.seenIn}
                      </span>
                    </p>
                  ) : null}
                </TiltCard>
              </Reveal>
            );
          })}
        </ul>

        <Reveal className="mt-8">
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 font-semibold text-accent"
          >
            Tell me what you need
            <ArrowRight
              size={18}
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
