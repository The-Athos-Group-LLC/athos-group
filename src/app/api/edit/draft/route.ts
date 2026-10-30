import { NextResponse } from "next/server";
import { editorOnly, looksLikeContent } from "@/lib/edit-api";
import { discardDraft, saveDraft } from "@/lib/store";

// The editor autosaves here. A draft is never visible on the public site until it's published.
export const PUT = editorOnly(async (request: Request) => {
  const { content } = await request.json();
  if (!looksLikeContent(content)) return NextResponse.json({ error: "That save looked incomplete, so it wasn't kept." }, { status: 400 });
  await saveDraft(content);
  return NextResponse.json({ ok: true });
});

export const DELETE = editorOnly(async () => {
  await discardDraft();
  return NextResponse.json({ ok: true });
});
