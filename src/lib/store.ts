import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { del, get, list, put } from "@vercel/blob";
import defaults from "@/content/site.json";
import type { Content } from "./render";

// Where the site's words and photos live once the editor has published:
// - On Vercel: Athos's Blob store. content/published.json is the live copy, content/draft.json the editor's work in
//   progress, and every publish also lands in content/history/ so any earlier version can be restored.
// - Locally (no Blob credentials): the same files under .content/ in the repo.
// Until the first publish, the site shows src/content/site.json (the approved design's content).

const PUBLISHED = "content/published.json";
const DRAFT = "content/draft.json";
const HISTORY = "content/history/";

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const LOCAL = path.join(process.cwd(), ".content");

async function readJson(pathname: string): Promise<Content | null> {
  if (!useBlob()) {
    try {
      return JSON.parse(await fs.readFile(path.join(LOCAL, pathname), "utf8"));
    } catch {
      return null;
    }
  }
  const res = await get(pathname, { access: "public", useCache: false });
  if (!res || res.statusCode !== 200) return null;
  return JSON.parse(await new Response(res.stream).text());
}

async function writeJson(pathname: string, data: Content) {
  const body = JSON.stringify(data, null, 2);
  if (!useBlob()) {
    const file = path.join(LOCAL, pathname);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return;
  }
  await put(pathname, body, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
}

/** What the public site shows. Falls back to the bundled content if nothing has been published yet. */
export async function getPublished(): Promise<Content> {
  return (await readJson(PUBLISHED)) ?? defaults;
}

export async function getDraft(): Promise<Content | null> {
  return readJson(DRAFT);
}

export async function saveDraft(content: Content) {
  await writeJson(DRAFT, { ...content, savedAt: new Date().toISOString() });
}

export async function discardDraft() {
  if (!useBlob()) return fs.rm(path.join(LOCAL, DRAFT), { force: true });
  await del(DRAFT).catch(() => {});
}

export async function publish(content: Content) {
  const stamp = new Date().toISOString();
  const doc = { ...content, savedAt: undefined, publishedAt: stamp };
  await writeJson(PUBLISHED, doc);
  await writeJson(`${HISTORY}${stamp.replace(/[:.]/g, "-")}.json`, doc);
  await discardDraft();
  return stamp;
}

export type Version = { id: string; publishedAt: string };

/** Earlier published versions, newest first. */
export async function listVersions(): Promise<Version[]> {
  let names: string[] = [];
  if (!useBlob()) {
    names = await fs.readdir(path.join(LOCAL, HISTORY)).catch(() => []);
  } else {
    const { blobs } = await list({ prefix: HISTORY, limit: 200 });
    names = blobs.map((b) => b.pathname.slice(HISTORY.length));
  }
  return names
    .filter((n) => n.endsWith(".json"))
    .map((n) => {
      const id = n.slice(0, -5);
      // 2026-10-30T18-04-11-123Z -> 2026-10-30T18:04:11.123Z
      const iso = id.replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "$1:$2:$3.$4Z");
      return { id, publishedAt: iso };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

export async function getVersion(id: string): Promise<Content | null> {
  if (!/^[\w-]+$/.test(id)) return null;
  return readJson(`${HISTORY}${id}.json`);
}
