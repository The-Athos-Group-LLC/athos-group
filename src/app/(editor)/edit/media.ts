"use client";

import { upload } from "@vercel/blob/client";

// Every photo is redrawn in the browser before it's uploaded: phone photos come out upright, at most 2400px wide,
// and without their hidden location data (EXIF/GPS). Logos are trimmed to their edges so the logo wall lines up.

const MAX_EDGE = 2400;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable"));
    img.src = url;
  });
}

// Bounding box of everything that isn't transparent or near-white
function contentBox(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const blank = d[i + 3] < 12 || (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245);
      if (blank) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), type, q));

export async function prepareImage(file: File, logo = false): Promise<File> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file; // nothing hidden to strip, nothing to resize
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error("This browser can't open that photo. Please use a JPG or PNG (iPhone photos: share them as JPG).");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
  let canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: logo })!;
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);

  const keepPng = logo || file.type === "image/png";
  if (logo) {
    const box = contentBox(ctx, w, h);
    if (box) {
      const pad = Math.round(Math.max(box.w, box.h) * 0.02);
      const out = document.createElement("canvas");
      out.width = box.w + pad * 2; out.height = box.h + pad * 2;
      out.getContext("2d")!.drawImage(canvas, box.x, box.y, box.w, box.h, pad, pad, box.w, box.h);
      canvas = out;
    }
  }
  const type = keepPng ? "image/png" : "image/jpeg";
  const blob = await toBlob(canvas, type, keepPng ? undefined : 0.86);
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").toLowerCase() || "image";
  return new File([blob], `${base}.${keepPng ? "png" : "jpg"}`, { type });
}

export async function uploadFile(file: File, blob: boolean, onProgress?: (pct: number) => void): Promise<string> {
  const name = file.name.replace(/[^\w.-]+/g, "-").toLowerCase();
  if (blob) {
    const res = await upload(`uploads/${name}`, file, {
      access: "public",
      handleUploadUrl: "/api/edit/upload",
      onUploadProgress: (e) => onProgress?.(e.percentage),
    });
    return res.url;
  }
  const form = new FormData();
  form.append("file", file);
  const r = await fetch("/api/edit/upload", { method: "POST", body: form });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Upload failed");
  return j.url;
}
