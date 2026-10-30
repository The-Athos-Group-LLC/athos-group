import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/edit", "/preview", "/api/"] },
    sitemap: "https://www.athosed.com/sitemap.xml",
  };
}
