"use client";

import { useSyncExternalStore } from "react";
import type { StudioEngine } from "@/lib/studio/engine";

const noopSubscribe = () => () => undefined;

/** Reads a value from the engine and re-renders only when that value changes. */
export function useEngineValue<T>(engine: StudioEngine | null, read: (e: StudioEngine) => T, fallback: T): T {
  return useSyncExternalStore(
    engine ? engine.subscribe : noopSubscribe,
    () => (engine ? read(engine) : fallback),
    () => fallback,
  );
}
