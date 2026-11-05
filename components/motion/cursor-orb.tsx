"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useEffect, useRef } from "react";
import { useFinePointer } from "@/lib/use-fine-pointer";

/**
 * Glowing gradient orb that follows the cursor inside its parent element.
 * On touch screens it drifts slowly on its own instead. Pure CSS gradient,
 * no particle library, so it stays light on mobile data.
 */
export function CursorOrb() {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const follow = fine && !reduce;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 55, damping: 18 });
  const sy = useSpring(y, { stiffness: 55, damping: 18 });

  useEffect(() => {
    if (!follow) return;
    const parent = ref.current?.parentElement;
    if (!parent) return;

    const onMove = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      x.set(e.clientX - (r.left + r.width / 2));
      y.set(e.clientY - (r.top + r.height / 3));
    };
    parent.addEventListener("pointermove", onMove);
    return () => parent.removeEventListener("pointermove", onMove);
  }, [follow, x, y]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        style={{ x: sx, y: sy }}
        className={`absolute left-1/2 top-1/3 -ml-[240px] -mt-[240px] size-[480px] rounded-full blur-2xl ${
          follow ? "" : "orb-drift"
        }`}
      >
        <div className="size-full rounded-full bg-[radial-gradient(circle,rgb(229_169_60/0.26),rgb(56_189_248/0.1)_45%,transparent_70%)]" />
      </motion.div>
    </div>
  );
}
