import "server-only";
import crypto from "node:crypto";
import { unstable_cache } from "next/cache";
import defaults from "@/content/site.json";
import { getPublished } from "./store";

export const CONTENT_TAG = "site-content";

// Builds keep their cache (locally and on Vercel), so the key includes the built-in content: a deploy that changes it
// never serves an earlier build's cached copy.
const BUILT_IN = crypto.createHash("sha1").update(JSON.stringify(defaults)).digest("hex").slice(0, 12);

// The published content, cached so the pages stay static. Publishing in the editor expires this tag.
export const getContent = unstable_cache(getPublished, ["site-content", BUILT_IN], { tags: [CONTENT_TAG] });
