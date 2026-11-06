import defaultQuotes from "@/lib/graphics/quotes.json";

/**
 * Editable quote library. It starts from lib/graphics/quotes.json and your
 * edits are saved in this browser only (localStorage), so nothing is lost on
 * refresh. Syncing across devices will come with the database step.
 */
const KEY = "gv-quote-library-v1";
export const seedQuotes: string[] = defaultQuotes;

const listeners = new Set<() => void>();
let cache: { raw: string | null; list: string[] } | null = null;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* storage can be blocked, fall back to the defaults */
  }
  if (cache && cache.raw === raw) return cache.list;
  let list = seedQuotes;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((q) => typeof q === "string")) {
        list = parsed as string[];
      }
    } catch {
      /* ignore corrupt data */
    }
  }
  cache = { raw, list };
  return list;
}

export function subscribeQuotes(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export const getQuotesSnapshot = read;
export const getServerQuotes = () => seedQuotes;

export function saveQuotes(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore, edits just will not persist */
  }
  cache = null;
  listeners.forEach((l) => l());
}

export function resetQuotes() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  cache = null;
  listeners.forEach((l) => l());
}
