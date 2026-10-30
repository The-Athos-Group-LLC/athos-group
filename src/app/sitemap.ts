import type { MetadataRoute } from "next";
import { VIEWS } from "@/lib/render";

export default function sitemap(): MetadataRoute.Sitemap {
  return VIEWS.map((v) => ({ url: `https://www.athosed.com${v.path === "/" ? "" : v.path}`, changeFrequency: "monthly", priority: v.id === "home" ? 1 : 0.7 }));
}
