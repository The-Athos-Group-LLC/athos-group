import type { Metadata } from "next";
import "./editor.css";

export const metadata: Metadata = { title: "Site editor | The Athos Group", robots: { index: false, follow: false } };

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="editor-body">{children}</body>
    </html>
  );
}
