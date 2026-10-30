// Renders every page of the site to HTML strings from the content JSON (src/content/site.json, or the published copy
// the editor writes). Pure string building with no Node or DOM APIs, so the server pages and the editor's live preview
// share it. Behaviour (dialogs, the climb, the mountain drawings, the contact form) lives in public/site.js.
//
// Ported from the approved mockup (Design C · Portfolio, Oct 2026). The live site never shows a placeholder: anything
// Athos hasn't supplied yet is simply left out.

import { MOUNTAIN_SVG } from "./mountain-svg";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Content = any;
export type View = "home" | "about" | "build" | "ideas" | "contact";

export const VIEWS: { id: View; path: string }[] = [
  { id: "home", path: "/" },
  { id: "about", path: "/about" },
  { id: "build", path: "/build" },
  { id: "ideas", path: "/impact" },
  { id: "contact", path: "/contact" },
];
const href = (id: View) => VIEWS.find((v) => v.id === id)!.path;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const marker = (t: string) => `<span class="marker">${esc(t)}</span>`;
const has = (s: unknown) => typeof s === "string" && s.trim() !== "";
/** Links typed into the editor: web addresses, email links and paths on this site only. */
export const safeUrl = (u: unknown) => {
  const s = String(u ?? "").trim();
  if (/^(https?:|mailto:)/i.test(s) || (s.startsWith("/") && !s.startsWith("//"))) return s;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return `https://${s}`; // "du.edu/milleracademy"
  return "";
};

export function pageTitleText(A: Content, view: View) {
  if (view === "home") return A.seo?.title || "The Athos Group";
  const label = A.nav.find((n: any) => n.id === view)?.label;
  return `${label} | The Athos Group`;
}

/* ---------- Shell ---------- */

function header(A: Content, current: View) {
  const nav = A.nav
    .map((n: any) => `<li><a href="${href(n.id)}" data-id="${n.id}"${n.id === current ? ' aria-current="page"' : ""}>${esc(n.label)}</a></li>`)
    .join("");
  return `<header class="site-head"><div class="wrap">
    <a class="brand" href="/"><img src="${esc(A.logoLine)}" alt="The Athos Group" width="755" height="52" id="head-logo"></a>
    <nav aria-label="Main"><ul class="nav" id="nav">${nav}</ul></nav>
  </div></header>`;
}

function footer(A: Content) {
  return `<footer class="foot"><div class="wrap">
    <a class="brand" href="/"><img src="/assets/brand/logo-stacked-navy.png" alt="The Athos Group" width="628" height="374"></a>
    <nav aria-label="Footer" id="foot-nav">${A.nav.map((n: any) => `<a href="${href(n.id)}">${esc(n.label)}</a>`).join("")}</nav>
    <span id="foot-text">${esc(A.footer)}</span>
  </div></footer>`;
}

const DIALOG = `<dialog id="story" aria-labelledby="story-title">
  <button class="dlg-close" type="button" aria-label="Close" id="story-close">×</button>
  <div class="dlg" id="story-body"></div>
</dialog>`;

/** The whole page body for one view: header, the view, footer, the story dialog and the data the behaviour script reads. */
export function renderPage(A: Content, view: View) {
  const stories = A.stories.map((s: any) => ({ ...s, link: s.link ? { ...s.link, href: safeUrl(s.link.href) } : null }));
  const data = { stories, videoTitle: A.whoWeAre?.video?.title || "" };
  return `${header(A, view)}
<main><section data-view="${view}">${VIEW_FNS[view](A)}</section></main>
${footer(A)}
${DIALOG}
<script type="image/svg+xml" id="mtn-svg">${MOUNTAIN_SVG}</script>
<script type="application/json" id="athos-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

/* ---------- Shared pieces ---------- */

const pageArt = `<img class="pt-art" src="/assets/motion/mountain-lines.svg" alt="">`;
function pageTitle(t: string, sub?: string) {
  return `<div class="page-title"><div class="wrap">${pageArt}<h1>${esc(t)}</h1>${has(sub) ? `<p>${esc(sub)}</p>` : ""}</div></div>`;
}
function frameImg(img: any) {
  return `<div class="frame"><img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy"></div>`;
}
// An image slot Athos hasn't filled: an empty, quiet well (never a note on the live site)
const emptyFrame = `<div class="frame"><span class="needed-frame"></span></div>`;
const pic = (img: any) => (img && has(img.src) ? frameImg(img) : emptyFrame);

function partnerCard(p: any) {
  return `<article class="partner" tabindex="0"><div class="pp">${has(p.img) ? `<img src="${esc(p.img)}" alt="${esc(p.name)}">` : ""}</div><div class="pc"><h3>${esc(p.name)}</h3><p class="role">${esc(p.role)}</p><p>${esc(p.bio)}</p></div></article>`;
}

function band(A: Content) {
  const B = A.contactBand;
  return `<div class="band"><div class="band-art" data-band-art aria-hidden="true"></div><div class="wrap">
      <h2>${esc(B.title)}</h2>
      <div class="bc"><p>${esc(B.body)}</p><a class="btn" href="${href("contact")}">${esc(B.cta)}</a></div>
      <div class="sign" aria-hidden="true"><img src="/assets/brand/mark-cream.png" alt="" width="326" height="169"></div>
    </div></div>`;
}

/* ---------- Home ---------- */

function plate(s: any) {
  return `<span class="plate">
      <span class="kicker"><span>${esc(s.kicker)}</span><span class="date">${esc(s.date)}</span></span>
      <span class="ttl">${esc(s.title)}</span>
    </span>`;
}
function tile(s: any) {
  let media = `<span class="needed-frame"></span>`;
  if (has(s.img)) media = s.logoish ? `<span class="logo-fill"><img src="${esc(s.img)}" alt="${esc(s.alt)}"></span>` : `<img src="${esc(s.img)}" alt="${esc(s.alt)}">`;
  return `<button class="tile t-${esc(s.id)}" type="button" data-story="${esc(s.id)}" aria-haspopup="dialog">${media}${plate(s)}</button>`;
}
// An open box for a story still to come: a photo only, nothing to open
function slotTile(s: any) {
  const media = has(s.img) ? `<img src="${esc(s.img)}" alt="${esc(s.alt)}" loading="lazy">` : `<span class="needed-frame"></span>`;
  return `<div class="tile slot t-${esc(s.id)}">${media}</div>`;
}

// The talk: a poster until clicked. Until Athos posts it to YouTube it's a still with a caption, no play button.
function film(V: any) {
  if (!V) return "";
  const caption = `<figcaption><b>${esc(V.title)}</b><span>${esc(V.by)}</span></figcaption>`;
  const id = youtubeId(V.youtube);
  if (!id) return `<figure class="film still"><div class="play"><img src="${esc(V.poster)}" alt="" loading="lazy"></div>${caption}</figure>`;
  return `<figure class="film">
      <button class="play" type="button" id="film-play" aria-label="Play the video: ${esc(V.title)}${has(V.duration) ? `, ${esc(V.duration)}` : ""}" data-yt="${esc(id)}">
        <img src="${esc(V.poster)}" alt="" loading="lazy">
        <span class="pb" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 2.5l9.5 5.5L4 13.5z"/></svg></span>
        ${has(V.duration) ? `<span class="dur" aria-hidden="true">${esc(V.duration)}</span>` : ""}
      </button>
      ${caption}
    </figure>`;
}
/** Accepts a bare video ID or any YouTube URL (watch, youtu.be, shorts, embed). */
export function youtubeId(v: unknown) {
  if (!has(v)) return "";
  const s = String(v).trim();
  const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(s) ? s : "";
}

function rulesLink(W: any) {
  return has(W.rulesPdf) && has(W.rulesLink)
    ? `<p><a class="textlink" href="${esc(safeUrl(W.rulesPdf))}" target="_blank" rel="noopener">${esc(W.rulesLink)}</a></p>`
    : "";
}

function climb(A: Content) {
  const S = A.build.areas[0];
  const n = S.items.length;
  const pad = (k: number) => String(k).padStart(2, "0");
  return `<section class="climb" id="climb" aria-labelledby="climb-title">
      <div class="climb-pin"><div class="wrap climb-grid">
        <div class="climb-text">
          <div class="head">${marker(A.build.title)}<h2 id="climb-title">${esc(S.title)}</h2></div>
          <ol class="steps" id="steps">${S.items.map(([t, d]: string[], i: number) => `<li class="step${i === 0 ? " on" : ""}"><span class="num">${pad(i + 1)} / ${pad(n)}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join("")}</ol>
          <div class="ticks" id="ticks" aria-hidden="true">${S.items.map((_: unknown, i: number) => `<span${i === 0 ? ' class="on"' : ""}></span>`).join("")}</div>
          <a class="climb-next" href="${href("build")}"><span class="w">${A.build.areas.map((a: any) => esc(a.short)).join(" · ")}</span><span class="ar" aria-hidden="true">→</span></a>
        </div>
        <div class="climb-art" id="climb-art" aria-hidden="true"></div>
      </div></div>
    </section>`;
}

const WALL_ORDER = ["mainstage", "miller", "gap", "reach", "academy", "breakthrough"]; // the bento's reading order

function home(A: Content) {
  const W = A.whoWeAre;
  const byId = (id: string) => A.stories.find((s: any) => s.id === id);
  const wall = [...WALL_ORDER.map(byId), ...A.stories.filter((s: any) => !WALL_ORDER.includes(s.id))].filter(Boolean);
  return `
    <div class="hero"><div class="wrap">
      <img class="hero-art" src="${esc(A.mountains)}" alt="">
      <div class="hero-top">
        <h1>${esc(A.tagline)}</h1>
        <div class="hero-side">
          <p>${esc(A.heroLine)}</p>
          <div class="links"><a class="btn" href="${href("build")}">What we build</a><a class="btn ghost" href="${href("contact")}">Contact us</a></div>
        </div>
      </div>
      <div class="wall" id="wall">
        ${wall.map(tile).join("")}
        ${(A.storySlots || []).map(slotTile).join("")}
      </div>
    </div></div>

    <div class="section"><div class="wrap who">
      <div class="head">${marker(W.marker)}<h2>${esc(W.title)}</h2></div>
      ${film(W.video)}
      <div class="copy">
        <p class="lead">${esc(W.lead)}</p>
        ${W.body.filter(has).map((p: string) => `<p>${esc(p)}</p>`).join("")}
        ${rulesLink(W)}
      </div>
    </div></div>

    <div class="section"><div class="wrap">
      <div class="head">${marker(A.clientsMarker || "Partners and Clients")}<h2>${esc(A.clientsTitle || "Trusted by institutions shaping the future")}</h2></div>
      <ul class="logos">
        ${A.clients.filter((c: any) => has(c.logo)).map((c: any) => `<li><span class="mark"><img src="${esc(c.logo)}" alt="${esc(c.name)} logo"></span><span class="nm">${esc(c.name)}</span></li>`).join("")}
      </ul>
    </div></div>

    <div class="section"><div class="wrap">
      <div class="head">${marker(A.quotesMarker)}<h2>${esc(A.quotesTitle)}</h2></div>
      <div class="quotes">
        ${A.quotes.filter((q: any) => has(q.text)).map((q: any) => `<figure class="quote"><blockquote>${esc(q.text)}”</blockquote><figcaption><b>${esc(q.name)}</b><span>${esc(q.org)}</span></figcaption></figure>`).join("")}
      </div>
    </div></div>

    ${climb(A)}

    <div class="section"><div class="wrap">
      <div class="head">${marker("Our People")}<h2>Founding Partners</h2></div>
      <div class="partners">${A.partners.map(partnerCard).join("")}</div>
    </div></div>
    ${band(A)}`;
}

/* ---------- About ---------- */

function about(A: Content) {
  const B = A.about;
  const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2);
  const person = (p: any) => `<article class="person"${has(p.img) ? ` tabindex="0"` : ""}>
      <div class="ph">${has(p.img) ? `<img src="${esc(p.img)}" alt="${esc(p.name)}">` : `<span class="mono" aria-hidden="true">${esc(initials(p.name))}</span>`}</div>
      <div class="pb"><h3>${esc(p.name)}</h3><p class="role">${esc(p.role)}</p>${has(p.bio) ? `<p class="bio">${esc(p.bio)}</p>` : ""}</div>
    </article>`;
  return `${pageTitle(B.title)}
    <div class="section people-sec" style="padding-top:0"><div class="wrap">
      <div class="split people">
        ${pic(B.peopleImage)}
        <div class="body"><p class="big">${esc(B.peopleText)}</p></div>
      </div>
      <div class="partners">${A.partners.map(partnerCard).join("")}</div>
      <div class="team">${A.team.map(person).join("")}</div>
    </div></div>
    <div class="section"><div class="wrap split mission">
      <div class="body"><div class="head">${marker("Our Mission")}<h2>${esc(B.missionSubtitle)}</h2></div><p class="big">${esc(B.mission)}</p></div>
      ${pic(B.missionImage)}
    </div></div>
    <div class="section"><div class="wrap">
      <div class="head">${marker("Our Principles")}<h2>${esc(B.principlesSubtitle)}</h2></div>
      <ul class="principles">${B.principles.map((p: any) => `<li><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></li>`).join("")}</ul>
    </div></div>
    ${band(A)}`;
}

/* ---------- What We Build ---------- */

function inAction(x: any) {
  if (!x || !safeUrl(x.href)) return "";
  return `<div class="act"><a class="btn" href="${esc(safeUrl(x.href))}" target="_blank" rel="noopener">${esc(x.label || "See it in action")}</a></div>`;
}
function build(A: Content) {
  const B = A.build;
  return `${pageTitle(B.title)}
    <div class="section" style="padding-top:0"><div class="wrap" style="display:grid;gap:clamp(32px,4vw,56px)">
      <div class="build-intro">
        <div class="intro">${B.intro.filter(has).map((p: string) => `<p>${esc(p)}</p>`).join("")}</div>
        ${pic(B.introImage)}
      </div>
      <div class="areas">
        ${B.areas.map((a: any, i: number) => `<article class="area">
          <div class="ah">
            <span class="word" aria-hidden="true">${esc(a.short)}</span>
            <h2>${esc(a.title)}</h2>
            ${has(a.context) ? `<button class="ctx-btn" type="button" aria-expanded="false" aria-controls="ctx-${i}"><span>Read more</span><span class="chev" aria-hidden="true"></span></button>
            <p class="ctx" id="ctx-${i}" hidden>${esc(a.context)}</p>` : ""}
            ${inAction(a.inAction)}
          </div>
          <ul>${a.items.map(([t, d]: string[]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ul>
        </article>`).join("")}
      </div>
    </div></div>
    ${band(A)}`;
}

/* ---------- Ideas & Impact ---------- */

function ideas(A: Content) {
  const I = A.ideas;
  const card = (it: any) => {
    const s = it.story && A.stories.find((x: any) => x.id === it.story);
    if (s) {
      const media = has(s.img) ? `<div class="cm${s.logoish ? " logo" : ""}"><img src="${esc(s.img)}" alt="${esc(s.alt)}"></div>` : `<div class="cm"><span class="needed-frame"></span></div>`;
      return `<button class="card" type="button" data-story="${esc(s.id)}" aria-haspopup="dialog">${media}<span class="cb">
          <span class="kicker"><span>${esc(it.kind)}: ${esc(s.kicker)}</span><span class="date">${esc(it.date)}</span></span>
          <h3>${esc(s.title)}</h3><p>${esc(s.caption)}</p><span class="open-hint">Read the story</span></span></button>`;
    }
    const media = has(it.img) ? `<div class="cm logo"><img src="${esc(it.img)}" alt=""></div>` : `<div class="cm"><span class="needed-frame"></span></div>`;
    const inner = `${media}<div class="cb">
        <span class="kicker"><span>${esc(it.kind)}</span><span class="date">${esc(it.date)}</span></span>
        <h3>${esc(it.title)}</h3><p>${esc(it.text)}</p>${safeUrl(it.href) ? `<span class="open-hint">Read more</span>` : ""}</div>`;
    return safeUrl(it.href)
      ? `<a class="card" href="${esc(safeUrl(it.href))}" target="_blank" rel="noopener">${inner}</a>`
      : `<article class="card">${inner}</article>`;
  };
  return `${pageTitle(I.title, I.subtitle)}
    <div class="section" style="padding-top:0"><div class="wrap"><div class="cards">${I.items.map(card).join("")}</div></div></div>
    ${band(A)}`;
}

/* ---------- Contact ---------- */

function contact(A: Content) {
  const C = A.contact;
  return `${pageTitle(C.title)}
    <div class="section" style="padding-top:0"><div class="wrap contact">
      <div class="info">
        <p class="desc">${esc(C.description)}</p>
        ${has(C.email) ? `<div class="email"><code id="email">${esc(C.email)}</code><button class="copy-btn" type="button" id="copy-email">Copy email</button></div>` : ""}
      </div>
      <form id="contact-form" novalidate>
        <label for="f-name">Full name *<input id="f-name" name="name" required autocomplete="name"></label>
        <label for="f-email">Email *<input id="f-email" name="email" type="email" required autocomplete="email"></label>
        <label for="f-org">Organization<input id="f-org" name="organization" autocomplete="organization"></label>
        <label for="f-msg">Message *<textarea id="f-msg" name="message" required></textarea></label>
        <button class="btn" type="submit" style="justify-self:start">Send message</button>
        <p class="form-note" id="form-note" hidden role="status"></p>
      </form>
    </div></div>`;
}

const VIEW_FNS: Record<View, (A: Content) => string> = { home, about, build, ideas, contact };
