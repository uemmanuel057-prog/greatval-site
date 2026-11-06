"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef, type ReactNode } from "react";

interface ParallaxProps {
  children: ReactNode;
  /** Pixels the content drifts up and down while scrolling past. */
  offset?: number;
  /** Zoom that hides the frame edge while drifting. Use 1 with offset 0 for no crop. */
  scale?: number;
  className?: string;
}

/** Slow vertical drift for images inside a clipped frame. */
export function Parallax({
  children,
  offset = 22,
  scale = 1.12,
  className = "",
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const range = reduce ? 0 : offset;
  const y = useTransform(scrollYProgress, [0, 1], [range, -range]);

  return (
    <div ref={ref} className={className}>
      {/* Scaled up slightly so the drift never exposes the frame edge */}
      <motion.div style={{ y, scale }} className="relative size-full">
        {children}
      </motion.div>
    </div>
  );
}
