import { NextResponse } from "next/server";
import { editorOnly } from "@/lib/edit-api";
import { getVersion, listVersions } from "@/lib/store";

// Every publish is kept. The editor lists them and can load one back in (as a draft, so nothing changes until Publish).
export const GET = editorOnly(async () => NextResponse.json({ versions: await listVersions() }));

export const POST = editorOnly(async (request: Request) => {
  const { id } = await request.json();
  const content = typeof id === "string" ? await getVersion(id) : null;
  if (!content) return NextResponse.json({ error: "Couldn't find that version." }, { status: 404 });
  return NextResponse.json({ content });
});
