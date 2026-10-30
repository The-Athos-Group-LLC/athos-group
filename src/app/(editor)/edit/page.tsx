import { editorConfigured, isEditor } from "@/lib/auth";
import { getDraft, getPublished } from "@/lib/store";
import Editor from "./Editor";
import Login from "./Login";

export const dynamic = "force-dynamic";

export default async function EditPage() {
  if (!editorConfigured()) {
    return (
      <main className="gate">
        <h1>The editor isn&rsquo;t switched on yet</h1>
        <p>Set EDITOR_PASSWORD and EDITOR_SECRET in the Vercel project, then redeploy.</p>
      </main>
    );
  }
  if (!(await isEditor())) return <Login />;
  const published = await getPublished();
  const draft = await getDraft();
  return <Editor initial={draft ?? published} published={published} blob={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} />;
}
