// What the editor shows for each page: every word and photo on the site, in the order it appears, with plain labels.
// Paths point into the content JSON (src/content/site.json). A list item's fields use paths relative to the item.

import type { View } from "@/lib/render";

export type Path = (string | number)[];
export type Field =
  | { k: "text" | "textarea" | "url" | "email"; path: Path; label: string; hint?: string }
  | { k: "image"; path: Path; alt?: Path; label: string; hint?: string; logo?: boolean }
  | { k: "pdf"; path: Path; label: string; hint?: string }
  | { k: "video"; path: Path; label: string; hint?: string }
  | { k: "paragraphs"; path: Path; label: string; hint?: string }
  | { k: "pairs"; path: Path; label: string; hint?: string; first: string; second: string }
  | { k: "story"; path: Path; label: string; hint?: string }
  | { k: "list"; path: Path; label: string; hint?: string; item: Field[]; title: (item: any) => string; fixed?: boolean; blank?: () => unknown; noun?: string } // eslint-disable-line @typescript-eslint/no-explicit-any
  | { k: "group"; label: string; hint?: string; fields: Field[] };

export type Tab = { id: string; label: string; view: View; sections: Field[] };

const img = (path: Path, label: string, hint?: string): Field => ({ k: "image", path: [...path, "src"], alt: [...path, "alt"], label, hint });

export const TABS: Tab[] = [
  {
    id: "home",
    label: "Home",
    view: "home",
    sections: [
      {
        k: "group",
        label: "Top of the page",
        fields: [
          { k: "text", path: ["tagline"], label: "Headline" },
          { k: "textarea", path: ["heroLine"], label: "Sentence beside the headline" },
        ],
      },
      {
        k: "list",
        path: ["stories"],
        label: "Story wall",
        hint: "The six photos under the headline. Clicking one opens its story.",
        fixed: true,
        title: (s) => s.kicker || "Story",
        item: [
          { k: "text", path: ["kicker"], label: "Name" },
          { k: "text", path: ["date"], label: "Date label" },
          { k: "text", path: ["title"], label: "Headline" },
          { k: "textarea", path: ["caption"], label: "Story", hint: "Shows when someone opens the photo." },
          { k: "image", path: ["img"], alt: ["alt"], label: "Photo" },
          { k: "image", path: ["img2"], alt: ["alt2"], label: "Second photo (optional)", hint: "Shows beside the first one in the story." },
          { k: "text", path: ["link", "label"], label: "Button label" },
          { k: "url", path: ["link", "href"], label: "Button link", hint: "Leave empty to hide the button." },
        ],
      },
      {
        k: "list",
        path: ["storySlots"],
        label: "Extra photos on the wall",
        hint: "The two smaller photos at the end of the wall.",
        fixed: true,
        title: (s) => s.alt || "Photo",
        item: [{ k: "image", path: ["img"], alt: ["alt"], label: "Photo" }],
      },
      {
        k: "group",
        label: "Who We Are",
        fields: [
          { k: "text", path: ["whoWeAre", "marker"], label: "Small label" },
          { k: "text", path: ["whoWeAre", "title"], label: "Heading" },
          { k: "textarea", path: ["whoWeAre", "lead"], label: "Opening line" },
          { k: "paragraphs", path: ["whoWeAre", "body"], label: "Paragraphs" },
          { k: "text", path: ["whoWeAre", "rulesLink"], label: "Nine Rules link text" },
          { k: "pdf", path: ["whoWeAre", "rulesPdf"], label: "Nine Rules PDF", hint: "The link shows once a PDF is added." },
          { k: "video", path: ["whoWeAre", "video", "url"], label: "Video link", hint: "Paste a YouTube or Vimeo link. Until there is one, the cover photo shows without a play button." },
          { k: "image", path: ["whoWeAre", "video", "poster"], label: "Video cover photo" },
          { k: "text", path: ["whoWeAre", "video", "title"], label: "Video title" },
          { k: "text", path: ["whoWeAre", "video", "by"], label: "Video caption" },
          { k: "text", path: ["whoWeAre", "video", "duration"], label: "Video length", hint: "For example 1:30" },
        ],
      },
      {
        k: "list",
        path: ["clients"],
        label: "Client logos",
        hint: "Logos look best on a transparent background. White space around them is trimmed automatically.",
        noun: "logo",
        title: (c) => c.name || "New logo",
        blank: () => ({ name: "", logo: "" }),
        item: [
          { k: "text", path: ["name"], label: "Organization" },
          { k: "image", path: ["logo"], label: "Logo", logo: true },
        ],
      },
      {
        k: "group",
        label: "Quotes",
        fields: [
          { k: "text", path: ["quotesMarker"], label: "Small label" },
          { k: "text", path: ["quotesTitle"], label: "Heading" },
          {
            k: "list",
            path: ["quotes"],
            label: "Quotes",
            noun: "quote",
            title: (q) => q.name || "New quote",
            blank: () => ({ text: "", name: "", org: "" }),
            item: [
              { k: "textarea", path: ["text"], label: "Quote", hint: "The closing quote mark is added for you." },
              { k: "text", path: ["name"], label: "Name" },
              { k: "text", path: ["org"], label: "Title or organization" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "about",
    label: "About",
    view: "about",
    sections: [
      { k: "text", path: ["about", "title"], label: "Page title" },
      { k: "group", label: "Team intro", fields: [img(["about", "peopleImage"], "Team photo"), { k: "textarea", path: ["about", "peopleText"], label: "Text beside the photo" }] },
      {
        k: "list",
        path: ["partners"],
        label: "Founding partners",
        hint: "Also shown on Home.",
        noun: "partner",
        title: (p) => p.name || "New partner",
        blank: () => ({ name: "", role: "", bio: "", img: "" }),
        item: [
          { k: "text", path: ["name"], label: "Name" },
          { k: "text", path: ["role"], label: "Title" },
          { k: "textarea", path: ["bio"], label: "Bio" },
          { k: "image", path: ["img"], label: "Headshot", hint: "Shows in black and white until someone hovers." },
        ],
      },
      {
        k: "list",
        path: ["team"],
        label: "Team",
        noun: "person",
        title: (p) => p.name || "New person",
        blank: () => ({ name: "", role: "", bio: "", img: "" }),
        item: [
          { k: "text", path: ["name"], label: "Name" },
          { k: "text", path: ["role"], label: "Title" },
          { k: "textarea", path: ["bio"], label: "Bio" },
          { k: "image", path: ["img"], label: "Headshot", hint: "Without one, their initials show instead." },
        ],
      },
      {
        k: "group",
        label: "Mission",
        fields: [
          { k: "text", path: ["about", "missionSubtitle"], label: "Heading" },
          { k: "textarea", path: ["about", "mission"], label: "Text" },
          img(["about", "missionImage"], "Photo"),
        ],
      },
      {
        k: "group",
        label: "Principles",
        fields: [
          { k: "text", path: ["about", "principlesSubtitle"], label: "Heading" },
          {
            k: "list",
            path: ["about", "principles"],
            label: "Principles",
            noun: "principle",
            title: (p) => p.title || "New principle",
            blank: () => ({ title: "", text: "" }),
            item: [
              { k: "text", path: ["title"], label: "Title" },
              { k: "textarea", path: ["text"], label: "Text" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "build",
    label: "What We Build",
    view: "build",
    sections: [
      { k: "text", path: ["build", "title"], label: "Page title" },
      { k: "group", label: "Intro", fields: [{ k: "paragraphs", path: ["build", "intro"], label: "Paragraphs" }, img(["build", "introImage"], "Photo")] },
      {
        k: "list",
        path: ["build", "areas"],
        label: "Build · Scale · Connect",
        hint: "The first one's steps are also the climb on Home.",
        fixed: true,
        title: (a) => a.short || "Area",
        item: [
          { k: "text", path: ["short"], label: "Big word" },
          { k: "text", path: ["title"], label: "Heading" },
          { k: "textarea", path: ["context"], label: "Read more text" },
          { k: "url", path: ["inAction", "href"], label: "See it in action link", hint: "Leave empty to hide the button." },
          { k: "pairs", path: ["items"], label: "Steps", first: "Step", second: "Description" },
        ],
      },
    ],
  },
  {
    id: "ideas",
    label: "Ideas & Impact",
    view: "ideas",
    sections: [
      { k: "text", path: ["ideas", "title"], label: "Page title" },
      { k: "textarea", path: ["ideas", "subtitle"], label: "Line under the title" },
      {
        k: "list",
        path: ["ideas", "items"],
        label: "Cards",
        hint: "Newest first. A card can show one of the stories from the Home wall, or its own headline, text and image.",
        noun: "card",
        title: (c) => (c.story ? `${c.kind || "Story"}: ${c.story}` : c.title || "New card"),
        blank: () => ({ kind: "Announcement", date: "", story: "", title: "", text: "", img: "", href: "" }),
        item: [
          { k: "text", path: ["kind"], label: "Type", hint: "For example Announcement. Leave empty to show just the story name." },
          { k: "text", path: ["date"], label: "Date label" },
          { k: "story", path: ["story"], label: "Show a story from the Home wall", hint: "Pick one to reuse its headline, photo and story. The fields below are then ignored." },
          { k: "text", path: ["title"], label: "Headline" },
          { k: "textarea", path: ["text"], label: "Text" },
          { k: "image", path: ["img"], label: "Image" },
          { k: "url", path: ["href"], label: "Link (optional)", hint: "Opens when someone clicks the card." },
        ],
      },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    view: "contact",
    sections: [
      { k: "text", path: ["contact", "title"], label: "Page title" },
      { k: "textarea", path: ["contact", "description"], label: "Text beside the form" },
      { k: "email", path: ["contact", "email"], label: "Email shown on the page" },
    ],
  },
  {
    id: "site",
    label: "Every page",
    view: "home",
    sections: [
      { k: "list", path: ["nav"], label: "Menu", fixed: true, title: (n) => n.label, item: [{ k: "text", path: ["label"], label: "Label" }] },
      {
        k: "group",
        label: "Navy band before the footer",
        fields: [
          { k: "text", path: ["contactBand", "title"], label: "Heading" },
          { k: "textarea", path: ["contactBand", "body"], label: "Text" },
          { k: "text", path: ["contactBand", "cta"], label: "Button label" },
        ],
      },
      { k: "text", path: ["footer"], label: "Footer line" },
      {
        k: "group",
        label: "Google and link previews",
        fields: [
          { k: "text", path: ["seo", "title"], label: "Site title" },
          { k: "textarea", path: ["seo", "description"], label: "Description" },
        ],
      },
    ],
  },
];
