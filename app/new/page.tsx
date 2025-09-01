// app/new/page.tsx
import { Suspense } from "react";
import NewPostClient from "@./NewPostClient";

export const dynamic = "force-dynamic";

export default function NewPage() {
  return (
    <Suspense fallback={<p>読み込み中…</p>}>
      <NewPostClient />
    </Suspense>
  );
}
