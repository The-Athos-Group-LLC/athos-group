// Behaviour for the server-rendered pages (src/lib/render.ts): story dialog, the talk's YouTube swap, What We Build's
// "Read more", the logo wall's sizing, the mountain drawings (contact band + the climb on Home) and the contact form.
// AthosSite.init() is safe to call again after the page is re-rendered (the editor's live preview does that).
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const preview = () => document.documentElement.dataset.preview === "1";
  let DATA = { stories: [], videoTitle: "" };

  // Phone: centre a link in the sideways nav strip, clear of the edge fade. Scrolls the strip only.
  function centre(a) {
    const strip = a.closest(".nav");
    if (strip && strip.scrollWidth > strip.clientWidth) strip.scrollLeft += a.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - a.offsetWidth) / 2;
  }

  /* ---------- Contact band: their mountain in cream lines, drawn outward from the summit, drifting with the scroll ---------- */
  const VBW = 3258;
  let bands = [];
  function mountainNode() {
    const src = document.getElementById("mtn-svg");
    const doc = new DOMParser().parseFromString(src.textContent, "image/svg+xml");
    if (doc.querySelector("parsererror")) throw new Error("mountain svg");
    const svg = document.importNode(doc.documentElement, true);
    ["width", "height", "role", "aria-label", "stroke"].forEach((a) => svg.removeAttribute(a));
    svg.setAttribute("class", "mtn"); svg.setAttribute("focusable", "false");
    return svg;
  }
  let bandIO = null;
  function initBands() {
    if (bandIO) bandIO.disconnect();
    bands = [...document.querySelectorAll("[data-band-art]")].map((host) => {
      try {
        const svg = mountainNode();
        const paths = [...svg.querySelectorAll("path[data-role]")];
        paths.forEach((el) => {
          const L = +el.dataset.len; // the gap is longer than the path so round caps never leave a dot behind
          el.style.strokeDasharray = `${L} ${L + 24}`;
          el.style.setProperty("--off", L + 12);
          el.style.setProperty("--d", Math.round((1500 * el.dataset.order) / paths.length) + "ms");
        });
        host.replaceChildren(svg);
        const layers = {};
        svg.querySelectorAll("g[data-layer]").forEach((g) => (layers[g.dataset.layer] = g));
        return { host, svg, layers };
      } catch (e) {
        host.innerHTML = `<img src="/assets/motion/mountain-lines.svg" alt="">`;
        return null;
      }
    }).filter(Boolean);
    sizeBands();
    if (reduce || !("IntersectionObserver" in window)) bands.forEach((b) => b.host.classList.add("drawn"));
    else {
      bandIO = new IntersectionObserver((ens) => ens.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("drawn");
        bandIO.unobserve(en.target);
      }), { threshold: 0.15 });
      bands.forEach((b) => bandIO.observe(b.host));
    }
  }
  // ~1.1px strokes at any width
  function sizeBands() { bands.forEach((b) => { const w = b.host.getBoundingClientRect().width; if (w) b.svg.setAttribute("stroke-width", ((1.1 * VBW) / w).toFixed(2)); }); }
  let drift = 0;
  function parallax() {
    drift = 0;
    const vh = window.innerHeight;
    bands.forEach((b) => {
      if (!b.host.offsetParent) return;
      const r = b.host.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const off = r.top + r.height / 2 - vh / 2, u = VBW / (r.width || 1);
      b.svg.style.transform = `translate3d(0, ${(off * 0.06).toFixed(1)}px, 0)`;
      if (b.layers.mid) b.layers.mid.setAttribute("transform", `translate(0 ${(off * 0.005 * u).toFixed(1)})`);
      if (b.layers.front) b.layers.front.setAttribute("transform", `translate(0 ${(off * 0.01 * u).toFixed(1)})`);
    });
  }

  /* ---------- What We Build on Home: the idea point climbs camp to camp as the pinned section scrolls by ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (v, a, b) => clamp((v - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  function bezier(x1, y1, x2, y2) { // CSS-style cubic-bezier easing, solved for x
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break; t -= e / d; }
      return Y(t);
    };
  }
  const ease = bezier(0.16, 1, 0.3, 1); // the house spring
  const ROUTE = [[1745, 1222], [2060, 985], [1440, 800], [1985, 585], [1390, 372], [1543.5, 104]];
  function catmull(pts, seg = 28) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      for (let j = 0; j < seg; j++) {
        const t = j / seg, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((c) => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  const polyD = (p) => "M" + p.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L");
  function cumLen(p) { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); return c; }
  function pointAt(p, c, s) { // point at arc length s along polyline p (cumulative lengths c)
    if (s <= 0) return p[0]; if (s >= c[c.length - 1]) return p[p.length - 1];
    let lo = 0, hi = c.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] < s) lo = m; else hi = m; }
    const t = (s - c[lo]) / (c[hi] - c[lo] || 1);
    return [lerp(p[lo][0], p[hi][0], t), lerp(p[lo][1], p[hi][1], t)];
  }
  let CL = { ok: false, step: -1 };
  function initClimb() {
    CL = { ok: false, step: -1 };
    const host = document.getElementById("climb-art");
    if (!host) return;
    try {
      const svg = mountainNode();
      svg.setAttribute("viewBox", "700 30 2000 1250");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      const rdg = svg.querySelector('path[data-role="ridge"]'); if (rdg) rdg.setAttribute("class", "rg");
      const rp = catmull(ROUTE), rc = cumLen(rp), RL = rc[rc.length - 1];
      const campS = ROUTE.map((c) => { let bi = 0, bd = 1e9; rp.forEach((q, i) => { const d = Math.hypot(q[0] - c[0], q[1] - c[1]); if (d < bd) { bd = d; bi = i; } }); return rc[bi]; });
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = `<path class="route-ahead" d="${polyD(rp)}"/><path class="route-done" d="${polyD(rp)}"/>`
        + ROUTE.slice(1).map((c) => `<circle class="camp" cx="${c[0]}" cy="${c[1]}" r="9"/>`).join("")
        + `<circle class="climb-halo" r="40"/><circle class="climb-pt" r="9"/>`;
      svg.appendChild(g);
      host.replaceChildren(svg);
      const done = g.querySelector(".route-done");
      done.style.strokeDasharray = `${RL.toFixed(1)} ${(RL + 24).toFixed(1)}`;
      CL = { ok: true, step: -1, host, svg, rp, rc, RL, campS, done, ahead: g.querySelector(".route-ahead"), camps: [...g.querySelectorAll(".camp")], pt: g.querySelector(".climb-pt"), halo: g.querySelector(".climb-halo"), sec: document.getElementById("climb"), steps: [...document.querySelectorAll("#steps .step")], ticks: [...document.querySelectorAll("#ticks span")] };
    } catch (e) { CL = { ok: false, step: -1 }; return; }
    sizeClimb();
    climbAt(reduce ? 1 : 0, reduce);
    onClimbScroll();
  }
  // Strokes and dots in screen pixels at any size
  function sizeClimb() {
    if (!CL.ok) return;
    const r = CL.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const u = Math.max(2000 / r.width, 1250 / r.height); // viewBox units per px under "meet"
    CL.svg.setAttribute("stroke-width", (1 * u).toFixed(2));
    CL.done.setAttribute("stroke-width", (2 * u).toFixed(2));
    CL.ahead.setAttribute("stroke-width", (2.4 * u).toFixed(2));
    CL.ahead.style.strokeDasharray = `0 ${(7 * u).toFixed(1)}`;
    CL.camps.forEach((c) => { c.setAttribute("r", (4.5 * u).toFixed(1)); c.setAttribute("stroke-width", (1.5 * u).toFixed(2)); });
    CL.pt.setAttribute("r", (5.5 * u).toFixed(1));
    CL.halo.setAttribute("r", (18 * u).toFixed(1));
  }
  // q (0..1 through the pinned section) -> distance along the route: each step travels to its camp, then rests there
  function climbAt(q, still) {
    const n = CL.campS.length - 1;
    const seg = Math.min(n - 1, Math.floor(q * n)), local = q * n - seg;
    const s = still ? CL.RL : lerp(CL.campS[seg], CL.campS[seg + 1], ease(span(local, 0, 0.5)));
    CL.done.style.strokeDashoffset = ((1 - s / CL.RL) * (CL.RL + 12)).toFixed(1);
    const pos = pointAt(CL.rp, CL.rc, s);
    [CL.pt, CL.halo].forEach((c) => { c.setAttribute("cx", pos[0].toFixed(1)); c.setAttribute("cy", pos[1].toFixed(1)); });
    CL.camps.forEach((c, i) => c.classList.toggle("on", s >= CL.campS[i + 1] - 1));
    CL.host.classList.toggle("done", s >= CL.RL - 1);
    if (!still && seg !== CL.step) {
      CL.steps.forEach((el, i) => { el.classList.toggle("on", i === seg); el.classList.toggle("was", i < seg); });
      CL.ticks.forEach((el, i) => el.classList.toggle("on", i <= seg));
      CL.step = seg;
    }
  }
  let climbRaf = 0;
  function onClimbScroll() {
    climbRaf = 0;
    if (!CL.ok || reduce || !CL.sec || !CL.sec.offsetParent) return;
    const vh = window.innerHeight, r = CL.sec.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) return;
    climbAt(clamp(-r.top / Math.max(1, r.height - vh)));
  }

  /* ---------- Story dialog ---------- */
  function openStory(id) {
    const s = DATA.stories.find((x) => x.id === id);
    const dlg = document.getElementById("story");
    if (!s || !dlg) return;
    let media;
    if (s.img && s.img2) media = `<div class="media"><img src="${esc(s.img)}" alt="${esc(s.alt)}"><img src="${esc(s.img2)}" alt="${esc(s.alt2)}"></div>`;
    else if (!s.img) media = `<div class="media"><span class="needed-frame"></span></div>`;
    else media = `<div class="media${s.logoish ? " logo" : ""}"><img src="${esc(s.img)}" alt="${esc(s.alt)}"></div>`;
    const link = s.link && s.link.href
      ? `<p class="more"><a class="btn" href="${esc(s.link.href)}" target="_blank" rel="noopener" aria-label="${esc(s.link.label || "Learn more")} about ${esc(s.kicker)} (opens in a new tab)">${esc(s.link.label || "Learn more")}</a></p>`
      : "";
    document.getElementById("story-body").innerHTML = `${media}<div class="txt">
      <span class="kicker"><span>${esc(s.kicker)}</span><span class="date">${esc(s.date)}</span></span>
      <h2 id="story-title">${esc(s.title)}</h2>
      <p class="cap">${esc(s.caption)}</p>${link}</div>`;
    dlg.showModal();
  }

  /* ---------- Contact form: posts to /api/contact (same inbox route as the old site) ---------- */
  async function submitContact(form) {
    const note = form.querySelector("#form-note");
    const say = (msg, err) => { note.textContent = msg; note.classList.toggle("err", !!err); note.hidden = false; };
    const val = (n) => (form.elements[n] ? form.elements[n].value.trim() : "");
    const body = { name: val("name"), email: val("email"), organization: val("organization"), message: val("message") };
    if (!body.name || !body.email || !body.message) return say("Please fill in your name, email and message.", true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return say("Please enter a valid email.", true);
    if (preview()) return say("Preview: the form works on the live site. Nothing was sent.");
    form.setAttribute("aria-busy", "true");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(String(r.status));
      form.reset();
      say("Thanks, your message is on its way. We'll be in touch soon.");
    } catch (e) {
      const email = document.getElementById("email");
      say(`Something went wrong sending your message.${email ? ` Please email us at ${email.textContent}.` : " Please try again."}`, true);
    } finally {
      form.removeAttribute("aria-busy");
    }
  }

  /* ---------- Listeners registered once ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target;
    const ctx = t.closest(".ctx-btn");
    if (ctx) {
      const open = ctx.getAttribute("aria-expanded") === "true";
      ctx.setAttribute("aria-expanded", String(!open));
      document.getElementById(ctx.getAttribute("aria-controls")).hidden = open;
      return;
    }
    const story = t.closest("[data-story]");
    if (story) return openStory(story.dataset.story);
    if (t.closest("#story-close")) return document.getElementById("story").close();
    if (t.id === "story") return t.close(); // backdrop
    const play = t.closest("#film-play");
    if (play && play.dataset.yt) {
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(play.dataset.yt)}?autoplay=1&rel=0`;
      f.title = DATA.videoTitle;
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      play.replaceWith(f);
      f.focus();
      return;
    }
    const copy = t.closest("#copy-email");
    if (copy) {
      const em = document.getElementById("email");
      const done = () => { copy.textContent = "Copied"; setTimeout(() => (copy.textContent = "Copy email"), 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(em.textContent).then(done, () => window.getSelection().selectAllChildren(em));
      else window.getSelection().selectAllChildren(em);
    }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "contact-form") return;
    e.preventDefault();
    submitContact(e.target);
  });
  document.addEventListener("focusin", (e) => { if (e.target.closest && e.target.closest("#nav")) centre(e.target); });
  window.addEventListener("resize", () => { sizeBands(); sizeClimb(); onClimbScroll(); });
  if (!reduce) window.addEventListener("scroll", () => {
    if (!drift) drift = requestAnimationFrame(parallax);
    if (!climbRaf) climbRaf = requestAnimationFrame(onClimbScroll);
  }, { passive: true });

  /* ---------- Per-render setup ---------- */
  function init() {
    try { DATA = JSON.parse(document.getElementById("athos-data").textContent); } catch (e) { DATA = { stories: [], videoTitle: "" }; }
    const cur = document.querySelector('#nav a[aria-current="page"]');
    if (cur) centre(cur); // keep the current page in view on phones
    // Logo wall: each logo reports its proportions so the CSS can size it by area (see .logos .mark img)
    document.querySelectorAll(".logos .mark img").forEach((img) => {
      const fit = () => img.style.setProperty("--sr", Math.sqrt(img.naturalWidth / img.naturalHeight).toFixed(3));
      if (img.complete && img.naturalWidth) fit(); else img.addEventListener("load", fit, { once: true });
    });
    initBands();
    initClimb();
  }
  window.AthosSite = { init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
