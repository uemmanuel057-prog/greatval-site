"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clapperboard, Radio, Users, Zap, type LucideIcon } from "lucide-react";
import type { Venture } from "@/lib/types";

const icons: Record<string, LucideIcon> = {
  "campus-pulse-ng": Radio,
  "ev-technology-concept": Zap,
  "model-x-africa": Users,
  fofc: Clapperboard,
};

function VentureBody({ venture, index }: { venture: Venture; index: number }) {
  const Icon = icons[venture.id] ?? Radio;
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-6 select-none font-mono text-8xl font-bold text-white/[0.04] sm:text-9xl"
      >
        0{index + 1}
      </span>
      <span className="flex size-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
        <Icon size={26} aria-hidden="true" />
      </span>
      <p className="eyebrow mt-6">{venture.category}</p>
      <h3 className="mt-3 text-3xl sm:text-4xl">{venture.name}</h3>
      <p className="mt-3 text-base font-semibold text-accent">{venture.role}</p>
      <p className="mt-5 max-w-xl text-ink-muted sm:text-lg">{venture.scope}</p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {venture.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full border border-code/30 bg-code/10 px-3 py-1 font-mono text-xs text-code"
          >
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VenturesShowcase({ ventures }: { ventures: Venture[] }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = ventures[active];

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const last = ventures.length - 1;
    let next = active;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      next = active === last ? 0 : active + 1;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      next = active === 0 ? last : active - 1;
    } else {
      return;
    }
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <>
      {/* Desktop: tabbed showcase */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-[320px_1fr]">
        <div
          role="tablist"
          aria-label="Featured ventures"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="flex flex-col gap-2"
        >
          {ventures.map((venture, i) => {
            const selected = i === active;
            return (
              <button
                key={venture.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${venture.id}`}
                aria-selected={selected}
                aria-controls="venture-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                className={`relative rounded-2xl px-5 py-4 text-left transition-colors ${
                  selected
                    ? "glass"
                    : "border border-transparent hover:bg-white/[0.03]"
                }`}
              >
                {selected ? (
                  <motion.span
                    layoutId="venture-indicator"
                    className="absolute inset-y-3 left-0 w-1 rounded-full bg-accent"
                  />
                ) : null}
                <span className="font-mono text-xs text-ink-subtle">
                  0{i + 1}
                </span>
                <span
                  className={`mt-1 block text-lg font-semibold ${
                    selected ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {venture.name}
                </span>
                <span className="block text-sm text-ink-subtle">
                  {venture.role}
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id="venture-panel"
          aria-labelledby={`tab-${current.id}`}
          data-beam="always"
          className="glass beam relative min-h-[420px] overflow-hidden rounded-3xl p-10"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <VentureBody venture={current} index={active} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile and tablet: swipeable snap carousel */}
      <div className="lg:hidden">
        <div
          role="region"
          aria-label="Featured ventures carousel"
          tabIndex={0}
          className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8"
        >
          {ventures.map((venture, i) => (
            <article
              key={venture.id}
              data-beam="always"
              className="glass beam relative w-[85%] shrink-0 snap-center overflow-hidden rounded-3xl p-6 sm:w-[60%] sm:p-8"
            >
              <VentureBody venture={venture} index={i} />
            </article>
          ))}
        </div>
        <p className="mt-2 text-center font-mono text-xs text-ink-subtle">
          Swipe to explore →
        </p>
      </div>
    </>
  );
}
