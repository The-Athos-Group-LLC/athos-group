"use client";

import { useEffect, useRef } from "react";
import { renderPage, type View } from "@/lib/render";

declare global {
  interface Window {
    AthosSite?: { init: () => void };
  }
}

export default function LivePreview() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.dataset.preview = "1";
    let lastView = "";
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.data?.type !== "athos-preview" || !host.current) return;
      const { content, view } = e.data as { content: unknown; view: View };
      const y = window.scrollY;
      host.current.innerHTML = renderPage(content, view);
      // Links would leave the preview; the editor's tabs switch pages instead
      host.current.querySelectorAll<HTMLAnchorElement>("a[href^='/']").forEach((a) => a.addEventListener("click", (ev) => ev.preventDefault()));
      window.AthosSite?.init();
      window.scrollTo(0, view === lastView ? y : 0);
      lastView = view;
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "athos-preview-ready" }, location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  return <div ref={host} style={{ display: "contents" }} />;
}
