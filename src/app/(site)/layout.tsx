import type { Metadata } from "next";
import Script from "next/script";
import { Nunito_Sans, Playfair_Display } from "next/font/google";
import { getContent } from "@/lib/content";
import "./site.css";

// Brand: Playfair Display Bold for headlines. Avenir Next is the brand body face; visitors who don't have it
// installed get Nunito Sans, its closest free match (see --body in site.css).
const display = Playfair_Display({ subsets: ["latin"], weight: "700", variable: "--f-display" });
const body = Nunito_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--f-body" });

export async function generateMetadata(): Promise<Metadata> {
  const A = await getContent();
  return {
    metadataBase: new URL("https://www.athosed.com"),
    title: A.seo?.title,
    description: A.seo?.description,
    openGraph: {
      title: A.seo?.title,
      description: A.seo?.description,
      siteName: "The Athos Group",
      type: "website",
      images: [{ url: "/assets/oct25/about-builders.jpg" }],
    },
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        <Script src="/site.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
