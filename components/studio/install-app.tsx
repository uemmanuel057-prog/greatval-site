"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "hidden" | "prompt" | "ios";

/** Registers the offline helper and offers "Install app". Android and desktop Chrome install in one tap. iPhone needs the Share menu. */
export function InstallApp() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/studio-sw.js", { scope: "/tools/studio" }).catch(() => undefined);
    }
    const installed =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (installed) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ios) setMode("ios");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setMode("prompt");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "hidden") return null;

  async function install() {
    if (mode === "ios" || !event) {
      setHelp(true);
      return;
    }
    await event.prompt();
    await event.userChoice;
    setEvent(null);
    setMode("hidden");
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={install} className="btn-glass !min-h-10 !px-4 text-sm">
        <Download size={16} aria-hidden="true" />
        Install as an app
      </button>
      {help ? (
        <div role="note" className="mt-3 flex max-w-md items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-ink-muted">
          <p className="flex-1">
            Tap the <Share size={14} className="mx-0.5 inline align-text-bottom text-accent" aria-label="Share" /> Share button in Safari, then choose{" "}
            <span className="text-ink">Add to Home Screen</span>.
          </p>
          <button type="button" aria-label="Close" onClick={() => setHelp(false)} className="grid size-6 place-items-center rounded-full hover:bg-white/10">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
