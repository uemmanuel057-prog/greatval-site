"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { pillars } from "@/lib/data/pillars";
import { pillarIcons } from "@/lib/pillar-icons";
import aboutPhoto from "@/public/images/great-val-about.webp";

/**
 * The three beats of the tagline. Each beat spotlights the pillars it
 * relates to, and the copy only repeats verified facts from the data files.
 */
const phases = [
  {
    word: "Build",
    line: "Building Ideas.",
    copy: "Websites, systems and ventures, from Next.js builds to solar and IP CCTV installs.",
    pillarIds: ["tech"],
  },
  {
    word: "Create",
    line: "Creating Value.",
    copy: "Media, storytelling and growth work, from live multi-cam broadcasts to ad campaigns.",
    pillarIds: ["creator", "marketing"],
  },
  {
    word: "Document",
    line: "Documenting Growth.",
    copy: "The process shared in public: the book, the podcast and the execution logs.",
    pillarIds: ["public"],
  },
] as const;

/** Orbit positions, clockwise from top-left. */
const angles = [-135, -45, 45, 135];

/**
 * Pinned scroll story. The tagline plays out as you scroll while the four
 * pillars orbit the portrait. Tap or hover a node to open its preview.
 */
export function StorySection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = Math.min(phases.length - 1, Math.floor(value * phases.length));
    if (next !== phase) {
      setPhase(next);
      setPicked(null); // scrolling hands control back to the story
    }
  });

  const current = phases[phase];
  const activeId = picked ?? current.pillarIds[0];
  const active = pillars.find((p) => p.id === activeId) ?? pillars[0];
  const ActiveIcon = pillarIcons[active.id];

  return (
    <section
      ref={ref}
      id="story"
      aria-label="How the work fits together"
      className="relative h-[300vh] border-b border-line"
    >
      <div className="sticky top-16 flex h-[calc(100dvh-4rem)] items-center overflow-hidden">
        <Container className="grid items-center gap-4 lg:grid-cols-2 lg:gap-14">
          {/* Copy */}
          <div className="order-2 lg:order-1">
            <p className="eyebrow">
              {String(phase + 1).padStart(2, "0")} / 03
            </p>

            <div className="relative mt-2 h-[4.25rem] sm:h-24 lg:h-32">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={current.word}
                  initial={reduce ? false : { opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -28 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl"
                >
                  <span className="text-accent">{current.word}</span>
                  <span className="text-ink">.</span>
                </motion.h2>
              </AnimatePresence>
            </div>

            <p className="mt-2 min-h-[3.5rem] max-w-md text-ink-muted sm:text-lg lg:min-h-[4.5rem]">
              <span className="sr-only">{current.line} </span>
              {current.copy}
            </p>

            {/* Progress rail */}
            <div className="mt-3 flex gap-2" aria-hidden="true">
              {phases.map((p, i) => (
                <span
                  key={p.word}
                  className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                    i <= phase ? "bg-accent" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            {/* Pillar preview */}
            <div
              aria-live="polite"
              className="glass mt-4 rounded-2xl p-4 sm:p-5 lg:mt-6"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                      <ActiveIcon size={18} aria-hidden="true" />
                    </span>
                    <h3 className="text-base font-bold sm:text-lg">
                      {active.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">{active.summary}</p>
                  <ul className="mt-3 hidden space-y-1.5 text-sm text-ink lg:block">
                    {active.highlights.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
              <Link
                href="/pillars"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
              >
                See all four pillars
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Orbit stage */}
          <div className="order-1 mx-auto w-full max-w-[17rem] sm:max-w-sm lg:order-2 lg:max-w-[30rem]">
            <div className="relative aspect-square">
              {/* Rings */}
              <div
                aria-hidden="true"
                className="spin-slow absolute inset-[6%] rounded-full border border-dashed border-white/15"
              />
              <div
                aria-hidden="true"
                className="absolute inset-[22%] rounded-full border border-white/10"
              />
              <div
                aria-hidden="true"
                className="absolute inset-[18%] rounded-full bg-accent/10 blur-3xl"
              />

              {/* Portrait */}
              <div className="absolute inset-[24%] overflow-hidden rounded-full border border-accent/40 shadow-[0_0_60px_-10px_rgb(229_169_60/0.45)]">
                <Image
                  src={aboutPhoto}
                  alt="GREAT VAL portrait"
                  fill
                  sizes="(min-width:1024px) 240px, 140px"
                  placeholder="blur"
                  className="object-cover object-[50%_20%]"
                />
              </div>

              {/* Pillar nodes */}
              {pillars.map((pillar, i) => {
                const Icon = pillarIcons[pillar.id];
                const rad = (angles[i] * Math.PI) / 180;
                const left = 50 + 44 * Math.cos(rad);
                const top = 50 + 44 * Math.sin(rad);
                const isActive = pillar.id === activeId;
                const inPhase = (current.pillarIds as readonly string[]).includes(
                  pillar.id,
                );
                return (
                  <button
                    key={pillar.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={pillar.title}
                    onClick={() => setPicked(pillar.id)}
                    onMouseEnter={() => setPicked(pillar.id)}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  >
                    <span
                      className={`${["float-a", "float-b", "float-c", "float-a"][i]} flex size-12 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-500 sm:size-14 lg:size-16 ${
                        isActive
                          ? "scale-110 border-accent bg-accent text-canvas shadow-[0_0_30px_rgb(229_169_60/0.55)]"
                          : inPhase
                            ? "border-accent/60 bg-accent/15 text-accent"
                            : "border-white/15 bg-white/5 text-ink-muted hover:border-accent/50"
                      }`}
                    >
                      <Icon size={22} aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}
