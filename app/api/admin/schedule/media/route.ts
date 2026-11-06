import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { listMedia, supabaseConfigured, uploadMedia } from "@/lib/schedule/supabase";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  if (!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))) return json({ error: "Unauthorized" }, 401);
  if (!supabaseConfigured()) return json({ items: [] });
  try {
    return json({ items: await listMedia() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not load images." }, 500);
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value))) return json({ error: "Unauthorized" }, 401);
  if (!supabaseConfigured()) return json({ error: "The database is not configured yet." }, 503);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "Choose an image file." }, 400);
  try {
    return json({ item: await uploadMedia(file) }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Upload failed." }, 400);
  }
}
