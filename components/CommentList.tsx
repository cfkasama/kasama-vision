"use client";
import { useEffect, useState } from "react";

export default function CommentList({ postId }: { postId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  async function load() {
    setErr("");
    try {
      const r = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "failed");
      setComments(j.comments || []);
    } catch (e: any) {
      setErr(`コメント取得に失敗しました: ${e?.message ?? e}`);
    }
  }
  useEffect(() => { load(); }, [postId]);

  async function submit(e: any) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j?.error ? `${j.error}${j.detail ? `: ${j.detail}` : ""}` : `HTTP ${r.status}`);
      }
      setContent("");
      await load(); // ← 投稿後に一覧を再取得
    } catch (e: any) {
      setErr(`コメント投稿に失敗しました: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6">
      <h4 className="mb-2 text-lg font-semibold">コメント</h4>
      <form onSubmit={submit} className="mb-3 space-y-2">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="気づき・応援・補足など"
          className="w-full rounded-md border p-2"
        />
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
            disabled={busy}
          >
            送信
          </button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {comments.map((c: any) => (
          <li key={c.id} className="rounded-xl border bg-white p-3">
            <div className="mb-1 text-xs text-gray-500">
              匿名さん・{new Date(c.createdAt).toLocaleString()}
            </div>
            <p className="prose-basic text-sm whitespace-pre-wrap break-words">{c.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}