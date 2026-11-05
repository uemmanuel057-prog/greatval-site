"use client";

import { useEffect, useState } from "react";
import { navItems, siteConfig } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  // Close the mobile menu on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <a
          href="#top"
          className="text-sm font-bold tracking-[0.18em] text-ink"
          onClick={() => setOpen(false)}
        >
          GREAT<span className="text-accent"> VAL</span>
        </a>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a href="#contact" className="btn-primary hidden md:inline-flex">
          Let&apos;s talk
        </a>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full border border-line-strong text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile navigation panel */}
      {open ? (
        <nav
          id="mobile-menu"
          aria-label={`${siteConfig.name} mobile`}
          className="border-t border-line bg-canvas md:hidden"
        >
          <ul className="mx-auto flex max-w-6xl flex-col px-5 py-3 sm:px-8">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line py-4 text-base text-ink last:border-0"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
