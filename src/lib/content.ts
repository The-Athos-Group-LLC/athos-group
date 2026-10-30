import "server-only";
import { unstable_cache } from "next/cache";
import { getPublished } from "./store";

export const CONTENT_TAG = "site-content";

// The published content, cached so the pages stay static. Publishing in the editor expires this tag.
export const getContent = unstable_cache(getPublished, ["site-content"], { tags: [CONTENT_TAG] });
