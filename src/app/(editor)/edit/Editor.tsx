"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VIEWS } from "@/lib/render";
import { Fields, setAt, type Ctx } from "./Fields";
import { TABS, type Path } from "./schema";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Status = "live" | "saving" | "draft" | "publishing" | "published" | "error";

const strip = (c: any) => {
  if (!c) return c;
  const { savedAt, publishedAt, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
};
const same = (a: any, b: any) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));
const HELP_SEEN = "athos-cms-help-seen";

export default function Editor({ initial, published: initialPublished, blob }: { initial: any; published: any; blob: boolean }) {
  const [content, setContent] = useState<any>(initial);
  const [published, setPublished] = useState<any>(initialPublished);
  const [tab, setTab] = useState(TABS[0].id);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [status, setStatus] = useState<Status>(same(initial, initialPublished) ? "live" : "draft");
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [history, setHistory] = useState<{ id: string; publishedAt: string }[] | null>(null);
  const [help, setHelp] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(content);
  useEffect(() => {
    latest.current = content;
  }, [content]);

  const current = TABS.find((t) => t.id === tab)!;
  const dirty = !same(content, published);

  // Live preview: the iframe renders whatever is in the editor, as you type
  const post = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: "athos-preview", content: latest.current, view: current.view }, location.origin);
  }, [current.view]);
  useEffect(() => {
    const t = setTimeout(post, 60);
    return () => clearTimeout(t);
  }, [content, post]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === "athos-preview-ready") post();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [post]);

  // First visit on this browser: show how it works until they dismiss it
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage only exists after hydration
      setHelp(localStorage.getItem(HELP_SEEN) !== "1");
    } catch {
      setHelp(true);
    }
  }, []);
  const closeHelp = () => {
    setHelp(false);
    try {
      localStorage.setItem(HELP_SEEN, "1");
    } catch {}
  };

  // Autosave the draft a moment after the last change. Nothing goes live until Publish.
  const save = useCallback(async (c: any) => {
    setStatus("saving");
    try {
      const r = await fetch("/api/edit/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: c }) });
      if (r.status === 401) throw new Error("You've been signed out. Copy anything you changed, then reload to sign in.");
      if (!r.ok) throw new Error((await r.json()).error || "Couldn't save the draft.");
      setStatus("draft");
      setMsg("");
    } catch (e) {
      setStatus("error");
      setMsg((e as Error).message);
    }
  }, []);

  const set = useCallback(
    (path: Path, value: unknown) => {
      setContent((c: any) => {
        const next = setAt(c, path, value);
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => save(next), 900);
        return next;
      });
      setConfirm(false);
      setStatus((s) => (s === "live" || s === "published" ? "draft" : s));
    },
    [save],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (status === "saving" || status === "publishing") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  async function publish() {
    clearTimeout(saveTimer.current);
    setStatus("publishing");
    setConfirm(false);
    try {
      const r = await fetch("/api/edit/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      if (!r.ok) throw new Error((await r.json()).error || "Couldn't publish.");
      setPublished(content);
      setStatus("published");
      setMsg("");
    } catch (e) {
      setStatus("error");
      setMsg((e as Error).message);
    }
  }

  async function discard() {
    clearTimeout(saveTimer.current);
    await fetch("/api/edit/draft", { method: "DELETE" });
    setContent(published);
    setStatus("live");
    setMsg("");
  }

  async function openHistory() {
    const r = await fetch("/api/edit/versions");
    setHistory(r.ok ? (await r.json()).versions : []);
  }
  async function loadVersion(id: string) {
    const r = await fetch("/api/edit/versions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!r.ok) return;
    const { content: v } = await r.json();
    setContent(v);
    save(v);
    setHistory(null);
  }

  const ctx: Ctx = useMemo(() => ({ content, set, blob }), [content, set, blob]);
  const statusText: Record<Status, string> = {
    live: "Everything here is live",
    saving: "Saving draft…",
    draft: dirty ? "Draft saved · not live yet" : "Everything here is live",
    publishing: "Publishing…",
    published: "Published · live now",
    error: msg || "Something went wrong",
  };
  const livePath = VIEWS.find((v) => v.id === current.view)!.path;

  return (
    <div className="ed">
      <header className="bar">
        <div className="brand">
          <img src="/assets/brand/mark-navy.png" alt="" width="34" height="18" />
          <span>Site editor</span>
        </div>
        <nav className="tabs" aria-label="Pages">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-current={t.id === tab ? "page" : undefined} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="actions">
          <span className={`status s-${status}${dirty && status === "draft" ? " dirty" : ""}`} role="status">
            {statusText[status]}
          </span>
          <button type="button" className="ghost" onClick={openHistory}>
            History
          </button>
          {dirty && status !== "publishing" && (
            <button type="button" className="ghost" onClick={discard}>
              Discard changes
            </button>
          )}
          {confirm ? (
            <button type="button" className="primary" onClick={publish} onBlur={() => setConfirm(false)} autoFocus>
              Publish to athosed.com
            </button>
          ) : (
            <button type="button" className="primary" disabled={!dirty || status === "saving" || status === "publishing"} title={dirty ? undefined : "Change something first"} onClick={() => setConfirm(true)}>
              Publish
            </button>
          )}
        </div>
      </header>

      <div className="main">
        <section className="panel" aria-label={`${current.label} content`}>
          <div className="panel-head">
            <h1>{current.label}</h1>
            <a href={livePath} target="_blank" rel="noopener">
              View live page ↗
            </a>
          </div>
          {help && (
            <aside className="help" aria-label="How the editor works">
              <h2>How this works</h2>
              <ol>
                <li>Pick a page at the top, then change any words or photos here.</li>
                <li>The preview on the right updates as you type. Your changes save on their own.</li>
                <li>Nothing changes on athosed.com until you press <b>Publish</b>.</li>
                <li>Every publish is kept in <b>History</b>, so you can always go back.</li>
              </ol>
              <button type="button" onClick={closeHelp}>
                Got it
              </button>
            </aside>
          )}
          <Fields fields={current.sections} ctx={ctx} />
          <form
            className="signout"
            onSubmit={async (e) => {
              e.preventDefault();
              await fetch("/api/edit/logout", { method: "POST" });
              location.reload();
            }}
          >
            {!help && (
              <button type="button" onClick={() => setHelp(true)}>
                How this works
              </button>
            )}
            <button type="submit">Sign out</button>
          </form>
        </section>

        <section className="stage" aria-label="Preview">
          <div className="stage-bar">
            <span>Preview · changes show as you type</span>
            <div className="seg" role="group" aria-label="Preview size">
              <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
                Desktop
              </button>
              <button type="button" aria-pressed={device === "phone"} onClick={() => setDevice("phone")}>
                Phone
              </button>
            </div>
          </div>
          <div className={`viewport ${device}`}>
            <iframe ref={frame} title="Preview" src="/preview" onLoad={post} />
          </div>
        </section>
      </div>

      {history && (
        <div className="drawer" role="dialog" aria-label="Earlier versions">
          <div className="drawer-head">
            <h2>Earlier versions</h2>
            <button type="button" onClick={() => setHistory(null)} aria-label="Close">
              ×
            </button>
          </div>
          <p className="hint">Every publish is saved. Loading one puts it in the editor as a draft. The site doesn’t change until you publish.</p>
          {history.length === 0 ? (
            <p className="hint">Nothing published from the editor yet.</p>
          ) : (
            <ul>
              {history.map((v) => (
                <li key={v.id}>
                  <span>{new Date(v.publishedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                  <button type="button" onClick={() => loadVersion(v.id)}>
                    Load
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
