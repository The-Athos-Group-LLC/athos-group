import { NextResponse } from "next/server";
import { editorConfigured, passwordMatches, startSession } from "@/lib/auth";

export async function POST(request: Request) {
  if (!editorConfigured()) return NextResponse.json({ error: "The editor isn't set up yet." }, { status: 503 });
  const { password } = await request.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: "That password isn't right." }, { status: 401 });
  }
  await startSession();
  return NextResponse.json({ ok: true });
}
