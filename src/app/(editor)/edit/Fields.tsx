"use client";

import { useId, useRef, useState } from "react";
import { videoEmbed } from "@/lib/render";
import { prepareImage, uploadFile } from "./media";
import type { Field, Path } from "./schema";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function getAt(obj: any, path: Path): any {
  return path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setAt(obj: any, path: Path, value: unknown): any {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) };
  copy[k as any] = setAt(obj?.[k as any], rest, value);
  return copy;
}

export type Ctx = { content: any; set: (path: Path, value: unknown) => void; blob: boolean };

export function Fields({ fields, base = [], ctx }: { fields: Field[]; base?: Path; ctx: Ctx }) {
  return (
    <>
      {fields.map((f, i) => (
        <FieldView key={i} f={f} base={base} ctx={ctx} />
      ))}
    </>
  );
}

function FieldView({ f, base, ctx }: { f: Field; base: Path; ctx: Ctx }) {
  const id = useId();
  if (f.k === "group") {
    return (
      <fieldset className="grp">
        <legend>{f.label}</legend>
        {f.hint && <p className="hint">{f.hint}</p>}
        <Fields fields={f.fields} base={base} ctx={ctx} />
      </fieldset>
    );
  }
  const path = [...base, ...f.path];
  const value = getAt(ctx.content, path);
  const set = (v: unknown) => ctx.set(path, v);
  const label = (
    <label className="lbl" htmlFor={id}>
      {f.label}
    </label>
  );
  const hint = f.hint ? <p className="hint">{f.hint}</p> : null;

  switch (f.k) {
    case "text":
    case "url":
    case "email":
      return (
        <div className="fld">
          {label}
          <input id={id} type={f.k === "text" ? "text" : f.k} value={value ?? ""} onChange={(e) => set(e.target.value)} placeholder={f.k === "url" ? "https://" : undefined} />
          {hint}
        </div>
      );
    case "textarea":
      return (
        <div className="fld">
          {label}
          <AutoText id={id} value={value ?? ""} onChange={set} />
          {hint}
        </div>
      );
    case "video": {
      const ok = videoEmbed(value);
      return (
        <div className="fld">
          {label}
          <input id={id} type="url" value={value ?? ""} onChange={(e) => set(e.target.value)} placeholder="https://vimeo.com/… or https://www.youtube.com/watch?v=…" />
          {value && !ok ? <p className="hint warn">That doesn't look like a YouTube or Vimeo link yet.</p> : hint}
        </div>
      );
    }
    case "image":
      return <ImageField f={f} base={base} ctx={ctx} value={value} set={set} />;
    case "pdf":
      return <PdfField id={id} label={f.label} hint={f.hint} value={value} set={set} blob={ctx.blob} />;
    case "story": {
      const stories = (ctx.content.stories ?? []) as any[];
      return (
        <div className="fld">
          {label}
          <select id={id} value={value ?? ""} onChange={(e) => set(e.target.value)}>
            <option value="">No, use the fields below</option>
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.kicker}
              </option>
            ))}
          </select>
          {hint}
        </div>
      );
    }
    case "paragraphs": {
      const items: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="fld">
          <span className="lbl">{f.label}</span>
          {items.map((p, i) => (
            <div className="para" key={i}>
              <AutoText value={p} onChange={(v) => set(items.map((x, j) => (j === i ? v : x)))} aria-label={`${f.label} ${i + 1}`} />
              <ItemTools i={i} n={items.length} move={(to) => set(move(items, i, to))} remove={() => set(items.filter((_, j) => j !== i))} noun="paragraph" />
            </div>
          ))}
          <button type="button" className="add" onClick={() => set([...items, ""])}>
            + Add a paragraph
          </button>
          {hint}
        </div>
      );
    }
    case "pairs": {
      const items: string[][] = Array.isArray(value) ? value : [];
      return (
        <div className="fld">
          <span className="lbl">{f.label}</span>
          {items.map(([a, b], i) => (
            <div className="pair" key={i}>
              <input value={a ?? ""} onChange={(e) => set(items.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} aria-label={`${f.first} ${i + 1}`} placeholder={f.first} />
              <AutoText value={b ?? ""} onChange={(v) => set(items.map((x, j) => (j === i ? [x[0], v] : x)))} aria-label={`${f.second} ${i + 1}`} placeholder={f.second} />
              <ItemTools i={i} n={items.length} move={(to) => set(move(items, i, to))} remove={() => set(items.filter((_, j) => j !== i))} noun="step" />
            </div>
          ))}
          <button type="button" className="add" onClick={() => set([...items, ["", ""]])}>
            + Add a step
          </button>
          {hint}
        </div>
      );
    }
    case "list":
      return <ListField f={f} path={path} value={value} set={set} ctx={ctx} />;
  }
}

function move<T>(arr: T[], from: number, to: number) {
  const a = [...arr];
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}

function ItemTools({ i, n, move, remove, noun }: { i: number; n: number; move?: (to: number) => void; remove?: () => void; noun: string }) {
  const [sure, setSure] = useState(false);
  return (
    <div className="tools">
      {move && (
        <>
          <button type="button" disabled={i === 0} onClick={() => move(i - 1)} aria-label={`Move ${noun} up`}>
            ↑
          </button>
          <button type="button" disabled={i === n - 1} onClick={() => move(i + 1)} aria-label={`Move ${noun} down`}>
            ↓
          </button>
        </>
      )}
      {remove &&
        (sure ? (
          <button type="button" className="danger" onClick={remove} onBlur={() => setSure(false)} autoFocus>
            Remove {noun}?
          </button>
        ) : (
          <button type="button" onClick={() => setSure(true)} aria-label={`Remove ${noun}`}>
            Remove
          </button>
        ))}
    </div>
  );
}

function ListField({ f, path, value, set, ctx }: { f: Extract<Field, { k: "list" }>; path: Path; value: any; set: (v: unknown) => void; ctx: Ctx }) {
  const items: any[] = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState<number | null>(null);
  const noun = f.noun ?? "item";
  return (
    <div className="list">
      <div className="list-head">
        <span className="lbl">{f.label}</span>
        {f.hint && <p className="hint">{f.hint}</p>}
      </div>
      {items.map((item, i) => (
        <details key={i} className="item" open={open === i} onToggle={(e) => (e.currentTarget.open ? setOpen(i) : open === i && setOpen(null))}>
          <summary>
            <span className="t">{f.title(item) || `${noun} ${i + 1}`}</span>
            <span className="chev" aria-hidden="true" />
          </summary>
          <div className="item-body">
            <Fields fields={f.item} base={[...path, i]} ctx={ctx} />
            {!f.fixed && (
              <ItemTools
                i={i}
                n={items.length}
                noun={noun}
                move={(to) => {
                  set(move(items, i, to));
                  setOpen(to);
                }}
                remove={() => {
                  set(items.filter((_, j) => j !== i));
                  setOpen(null);
                }}
              />
            )}
          </div>
        </details>
      ))}
      {!f.fixed && f.blank && (
        <button
          type="button"
          className="add"
          onClick={() => {
            set([...items, f.blank!()]);
            setOpen(items.length);
          }}
        >
          + Add a {noun}
        </button>
      )}
    </div>
  );
}

function AutoText({ value, onChange, ...rest }: { value: string; onChange: (v: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  return <textarea {...rest} value={value} rows={Math.min(14, Math.max(2, Math.ceil((value?.length ?? 0) / 52) + 1))} onChange={(e) => onChange(e.target.value)} />;
}

function useUpload(blob: boolean) {
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  async function run(file: File, prep?: (f: File) => Promise<File>) {
    setErr("");
    setBusy(0);
    try {
      const ready = prep ? await prep(file) : file;
      return await uploadFile(ready, blob, (p) => setBusy(p));
    } catch (e) {
      setErr((e as Error).message || "Upload failed. Try again.");
      return null;
    } finally {
      setBusy(null);
    }
  }
  return { busy, err, run };
}

function ImageField({ f, base, ctx, value, set }: { f: Extract<Field, { k: "image" }>; base: Path; ctx: Ctx; value: any; set: (v: unknown) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const altId = useId();
  const { busy, err, run } = useUpload(ctx.blob);
  const altPath = f.alt ? [...base, ...f.alt] : null;
  const pick = async (file?: File) => {
    if (!file) return;
    const url = await run(file, (x) => prepareImage(x, f.logo));
    if (url) set(url);
  };
  return (
    <div className="fld">
      <span className="lbl">{f.label}</span>
      <div
        className={`img${f.logo ? " logo" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
      >
        {value ? <img src={value} alt="" /> : <span className="empty">No image</span>}
        <div className="img-tools">
          <button type="button" onClick={() => input.current?.click()} disabled={busy !== null}>
            {busy !== null ? `Uploading ${Math.round(busy)}%` : value ? "Replace" : "Add image"}
          </button>
          {value && busy === null && (
            <button type="button" onClick={() => set("")}>
              Remove
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif" hidden onChange={(e) => pick(e.target.files?.[0] ?? undefined)} />
      </div>
      {err && <p className="hint warn">{err}</p>}
      {altPath && value && (
        <>
          <label className="lbl sub" htmlFor={altId}>
            Describe the image <span>(for screen readers and Google)</span>
          </label>
          <input id={altId} value={getAt(ctx.content, altPath) ?? ""} onChange={(e) => ctx.set(altPath, e.target.value)} />
        </>
      )}
      {f.hint && <p className="hint">{f.hint}</p>}
    </div>
  );
}

function PdfField({ id, label, hint, value, set, blob }: { id: string; label: string; hint?: string; value: any; set: (v: unknown) => void; blob: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const { busy, err, run } = useUpload(blob);
  return (
    <div className="fld">
      <span className="lbl" id={id}>
        {label}
      </span>
      <div className="pdf">
        {value ? (
          <a href={value} target="_blank" rel="noopener">
            {decodeURIComponent(String(value).split("/").pop() || "PDF")}
          </a>
        ) : (
          <span className="empty">No PDF yet</span>
        )}
        <button type="button" onClick={() => input.current?.click()} disabled={busy !== null}>
          {busy !== null ? `Uploading ${Math.round(busy)}%` : value ? "Replace" : "Add PDF"}
        </button>
        {value && busy === null && (
          <button type="button" onClick={() => set("")}>
            Remove
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="application/pdf"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = await run(file);
            if (url) set(url);
          }}
        />
      </div>
      {err && <p className="hint warn">{err}</p>}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
