import "server-only";
import { NextResponse } from "next/server";
import { isEditor } from "./auth";

/** Runs an editor API handler only for a signed-in editor. */
export function editorOnly<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    if (!(await isEditor())) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    try {
      return await fn(...args);
    } catch (e) {
      console.error("editor api", e);
      return NextResponse.json({ error: "Something went wrong. Your changes are still in the editor; try again." }, { status: 500 });
    }
  };
}

/** The minimum shape the pages need, so a bad save can never take the site down. */
export function looksLikeContent(c: unknown): c is Record<string, unknown> {
  const A = c as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  return Boolean(
    A && typeof A === "object" &&
    Array.isArray(A.nav) && Array.isArray(A.stories) && Array.isArray(A.clients) && Array.isArray(A.quotes) &&
    Array.isArray(A.partners) && Array.isArray(A.team) && A.whoWeAre && A.about && A.build && Array.isArray(A.build.areas) &&
    A.build.areas.length > 0 && A.ideas && Array.isArray(A.ideas.items) && A.contact && A.contactBand,
  );
}
