import fs from "node:fs/promises";
import path from "node:path";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isEditor } from "@/lib/auth";

// Photos, logos and PDFs from the editor. On Vercel the browser uploads straight to Athos's Blob store (no size cap
// from the server); this route only hands out the upload permission, and only to a signed-in editor.
// Running locally without Blob, files land in public/uploads-local/ instead.

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif", "application/pdf"];
const MAX = 40 * 1024 * 1024;

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return localUpload(request);
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isEditor())) throw new Error("Please sign in again.");
        if (!pathname.startsWith("uploads/")) throw new Error("Bad upload path.");
        return { allowedContentTypes: TYPES, maximumSizeInBytes: MAX, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

async function localUpload(request: Request) {
  if (!(await isEditor())) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !TYPES.includes(file.type) || file.size > MAX) {
    return NextResponse.json({ error: "That file type isn't supported." }, { status: 400 });
  }
  const name = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, "-")}`;
  const dir = path.join(process.cwd(), "public/uploads-local");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads-local/${name}` });
}
