import type { Metadata } from "next";
import { getContent } from "./content";
import { pageTitleText, renderPage, VIEWS, type View } from "./render";

// Every public page is the same thing: the published content rendered for one view.
export function sitePage(view: View) {
  async function Page() {
    const A = await getContent();
    return <div className="site" style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: renderPage(A, view) }} />;
  }
  async function generateMetadata(): Promise<Metadata> {
    const A = await getContent();
    const title = pageTitleText(A, view);
    return { title, openGraph: { title }, alternates: { canonical: VIEWS.find((v) => v.id === view)!.path } };
  }
  return { Page, generateMetadata };
}
