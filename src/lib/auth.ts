import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

// The editor's sign-in: one shared password (EDITOR_PASSWORD) set in Athos's Vercel project. A signed cookie keeps
// an editor signed in for 30 days. EDITOR_SECRET signs the cookie; changing it signs everyone out.

const COOKIE = "athos_edit";
const DAYS = 30;

export const editorConfigured = () => Boolean(process.env.EDITOR_PASSWORD && process.env.EDITOR_SECRET);

const sign = (exp: string) => crypto.createHmac("sha256", process.env.EDITOR_SECRET!).update(`edit.${exp}`).digest("hex");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function passwordMatches(input: string) {
  if (!editorConfigured()) return false;
  const want = crypto.createHash("sha256").update(process.env.EDITOR_PASSWORD!).digest("hex");
  const got = crypto.createHash("sha256").update(input).digest("hex");
  return safeEqual(want, got);
}

export async function startSession() {
  const exp = String(Date.now() + DAYS * 86400_000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isEditor() {
  if (!editorConfigured()) return false;
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, mac] = v.split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  return safeEqual(mac, sign(exp));
}
