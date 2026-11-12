/**
 * Decides whether this visitor should get the 3D version.
 * 3D is for good phones on a good connection. Everyone else gets the fast flat version.
 * Browsers that do not report something (Safari hides memory and network) are given the benefit of the doubt;
 * the speed watchdog in scenes.ts catches them if they turn out to be slow.
 */

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
}

export interface DeviceReport {
  ok: boolean;
  /** Why 3D was switched off. Empty when ok. */
  reasons: string[];
  /** What was measured, for the preview page. */
  facts: string[];
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function assessDevice(): DeviceReport {
  const reasons: string[] = [];
  const facts: string[] = [];
  if (typeof window === "undefined") return { ok: false, reasons: ["Not in a browser"], facts };

  const nav = navigator as Navigator & { connection?: NetworkInformation; deviceMemory?: number };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  facts.push(`Reduce motion: ${reduced ? "on" : "off"}`);
  if (reduced) reasons.push("The device asks for reduced motion");

  const conn = nav.connection;
  if (conn) {
    facts.push(`Connection: ${conn.effectiveType ?? "unknown"}${conn.downlink ? `, about ${conn.downlink} Mbps` : ""}`);
    facts.push(`Data saver: ${conn.saveData ? "on" : "off"}`);
    if (conn.saveData) reasons.push("Data saver is on");
    if (conn.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType)) reasons.push(`The connection is slow (${conn.effectiveType})`);
    else if (typeof conn.downlink === "number" && conn.downlink > 0 && conn.downlink < 1.5) reasons.push("The connection speed is low");
  } else {
    facts.push("Connection: not reported by this browser");
  }

  if (typeof nav.deviceMemory === "number") {
    facts.push(`Memory: about ${nav.deviceMemory} GB`);
    if (nav.deviceMemory < 4) reasons.push("The device has little memory");
  } else {
    facts.push("Memory: not reported by this browser");
  }

  const cores = nav.hardwareConcurrency;
  if (cores) {
    facts.push(`Processor cores: ${cores}`);
    if (cores < 4) reasons.push("The device has a small processor");
  }

  const gl = hasWebGL();
  facts.push(`3D graphics: ${gl ? "supported" : "not supported"}`);
  if (!gl) reasons.push("3D graphics are not available");

  return { ok: reasons.length === 0, reasons, facts };
}
