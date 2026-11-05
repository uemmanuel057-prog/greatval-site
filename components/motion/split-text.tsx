"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

interface SplitTextProps {
  text: string;
  as?: "h1" | "h2" | "p";
  by?: "word" | "char";
  className?: string;
  id?: string;
  delay?: number;
  /** A word from `text` to colour gold. */
  accent?: string;
}

const container = (delay: number, stagger: number): Variants => ({
  hidden: {},
  show: { transition: { delayChildren: delay, staggerChildren: stagger } },
});

const item: Variants = {
  hidden: { opacity: 0, y: "0.45em", filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Staggered word/character reveal.
 * The real text stays in `aria-label`, so screen readers read it normally.
 */
export function SplitText({
  text,
  as: Tag = "p",
  by = "word",
  className,
  id,
  delay = 0.1,
  accent,
}: SplitTextProps) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  return (
    <Tag id={id} aria-label={text} className={className}>
      <motion.span
        aria-hidden="true"
        className="inline"
        variants={container(delay, by === "char" ? 0.045 : 0.07)}
        initial={reduce ? false : "hidden"}
        animate="show"
      >
        {words.map((word, i) => (
          <span key={`${word}-${i}`}>
            <span
              className={`inline-block whitespace-nowrap ${
                accent === word ? "text-accent" : ""
              }`}
            >
              {by === "char" ? (
                word.split("").map((char, j) => (
                  <motion.span
                    key={`${char}-${j}`}
                    variants={item}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))
              ) : (
                <motion.span variants={item} className="inline-block">
                  {word}
                </motion.span>
              )}
            </span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
