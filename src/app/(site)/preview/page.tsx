import { notFound } from "next/navigation";
import { isEditor } from "@/lib/auth";
import LivePreview from "./LivePreview";

// The editor's preview pane: the real site, rendered in the browser from whatever is in the editor right now.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage() {
  if (!(await isEditor())) notFound();
  return <LivePreview />;
}
