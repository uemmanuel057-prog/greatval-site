import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_SECONDS,
  adminConfigured,
  createSessionToken,
  safeEqual,
} from "@/lib/admin-auth";

// Best-effort brute-force slowdown. Serverless instances do not share memory,
// so this limits bursts, it is not a hard lockout.
const failures = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Admin is not configured. Set ADMIN_PASSCODE and ADMIN_SESSION_SECRET." },
      { status: 503 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const record = failures.get(ip);
  if (record && now - record.first < WINDOW_MS && record.count >= MAX_FAILS) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let passcode = "";
  try {
    const body = (await request.json()) as { passcode?: unknown };
    passcode = typeof body.passcode === "string" ? body.passcode.slice(0, 200) : "";
  } catch {
    /* fall through to the failure path */
  }

  if (!safeEqual(passcode, process.env.ADMIN_PASSCODE ?? "")) {
    const fresh = record && now - record.first < WINDOW_MS ? record : { count: 0, first: now };
    failures.set(ip, { count: fresh.count + 1, first: fresh.first });
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }

  failures.delete(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return response;
}
