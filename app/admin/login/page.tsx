"use client";

import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Container } from "@/components/ui/container";

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        // Only follow a same-site admin path, never an arbitrary address.
        const next = new URLSearchParams(window.location.search).get("next") ?? "";
        window.location.assign(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin/graphics");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not sign in.");
    } catch {
      setError("Network error. Try again.");
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="login-title" className="py-20 sm:py-28">
      <Container className="max-w-md">
        <form onSubmit={submit} className="card">
          <span className="flex size-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
            <Lock size={22} aria-hidden="true" />
          </span>
          <h1 id="login-title" className="mt-6 text-2xl font-bold">
            Admin access
          </h1>
          <p className="mt-2 text-sm text-ink-muted">Private tools for GREAT VAL. Enter the passcode to continue.</p>
          <label htmlFor="passcode" className="eyebrow mt-6 block">
            Passcode
          </label>
          <input
            id="passcode"
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-ink focus-visible:outline-2 focus-visible:outline-accent"
          />
          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy || !passcode} className="btn-gold mt-6 w-full justify-center disabled:opacity-50">
            {busy ? "Checking..." : "Enter"}
          </button>
        </form>
      </Container>
    </section>
  );
}
