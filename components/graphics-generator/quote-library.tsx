"use client";

import { useSyncExternalStore } from "react";
import { Dices, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  getQuotesSnapshot,
  getServerQuotes,
  resetQuotes,
  saveQuotes,
  subscribeQuotes,
} from "@/lib/graphics/quote-store";

interface QuoteLibraryProps {
  /** The text currently in the editor. */
  current: string;
  selected: number | null;
  onSelect: (index: number | null, text: string) => void;
}

/** Editable list of saved quotes with random pick, save, update and delete. */
export function QuoteLibrary({ current, selected, onSelect }: QuoteLibraryProps) {
  const quotes = useSyncExternalStore(subscribeQuotes, getQuotesSnapshot, getServerQuotes);
  const text = current.trim();
  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40";

  function random() {
    if (quotes.length === 0) return;
    let index = Math.floor(Math.random() * quotes.length);
    if (quotes.length > 1 && quotes[index] === current) index = (index + 1) % quotes.length;
    onSelect(index, quotes[index]);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={random} disabled={quotes.length === 0}>
          <Dices size={15} aria-hidden="true" /> Random quote
        </button>
        <button
          type="button"
          className={btn}
          disabled={!text}
          onClick={() => {
            saveQuotes([...quotes, text]);
            onSelect(quotes.length, text);
          }}
        >
          <Save size={15} aria-hidden="true" /> Save as new
        </button>
        <button
          type="button"
          className={btn}
          disabled={selected === null || !text || quotes[selected] === undefined}
          onClick={() => {
            if (selected === null) return;
            saveQuotes(quotes.map((q, i) => (i === selected ? text : q)));
          }}
        >
          <Save size={15} aria-hidden="true" /> Update selected
        </button>
        <button
          type="button"
          className={btn}
          disabled={selected === null || quotes[selected] === undefined}
          onClick={() => {
            if (selected === null) return;
            saveQuotes(quotes.filter((_, i) => i !== selected));
            onSelect(null, current);
          }}
        >
          <Trash2 size={15} aria-hidden="true" /> Delete
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            if (window.confirm("Replace your quote list with the original set?")) {
              resetQuotes();
              onSelect(null, current);
            }
          }}
        >
          <RotateCcw size={15} aria-hidden="true" /> Reset list
        </button>
      </div>

      <p className="mt-4 font-mono text-xs text-ink-subtle">
        {quotes.length} saved. Pick one to load it into the editor above. Edits stay in this browser.
      </p>
      <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2">
        {quotes.map((quote, i) => (
          <li key={`${i}-${quote}`}>
            <button
              type="button"
              onClick={() => onSelect(i, quote)}
              aria-pressed={selected === i}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                selected === i ? "bg-accent/15 text-accent" : "text-ink-muted hover:bg-white/[0.05] hover:text-ink"
              }`}
            >
              {quote}
            </button>
          </li>
        ))}
        {quotes.length === 0 ? <li className="px-3 py-2 text-sm text-ink-subtle">No saved quotes. Write one above and save it.</li> : null}
      </ul>
    </div>
  );
}
