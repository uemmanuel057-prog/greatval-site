"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Container } from "@/components/ui/container";

/** Strip shown on private admin pages. */
export function AdminBar({ title }: { title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="border-b border-line bg-raised">
      <Container className="flex items-center justify-between gap-4 py-3">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
          <span className="text-accent">Admin</span> / {title}
        </p>
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
        >
          <LogOut size={14} aria-hidden="true" />
          Log out
        </button>
      </Container>
    </div>
  );
}
