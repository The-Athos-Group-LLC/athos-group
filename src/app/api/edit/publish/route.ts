import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CONTENT_TAG } from "@/lib/content";
import { editorOnly, looksLikeContent } from "@/lib/edit-api";
import { publish } from "@/lib/store";

export const POST = editorOnly(async (request: Request) => {
  const { content } = await request.json();
  if (!looksLikeContent(content)) return NextResponse.json({ error: "That version looked incomplete, so it wasn't published." }, { status: 400 });
  const publishedAt = await publish(content);
  revalidateTag(CONTENT_TAG, { expire: 0 }); // live on the next page view, not "eventually"
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, publishedAt });
});
