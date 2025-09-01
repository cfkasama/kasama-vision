// components/CommentList.tsx
"use client";
import { useEffect, useState } from "react";

export default function CommentList({ postId }: { postId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(signal?: AbortSignal) {
    try {
      const r = await fetch(`/api/posts/${postId}/comments`, { signal });
      const j = await r.json();
      setComments(j.comments || []);
    } catch (e) {
      // ページ離脱などのAbortは無視
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [postId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;

    setBusy(true);
    setError("");

    // 楽観的更新（先に表示）
    const temp = {
      id: "temp-" + Math.random().toString(36).slice(2),
      content,
      createdAt: new Date().toISOString(),
      postId,
      identityId: null,
    };
    setComments((prev) => [temp, ...prev]);

    try {
      const r = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || "failed");

      setContent("");
      // サーバー確定状態で再同期（tempを正規データに置換）
      await load();
    } catch (e) {
      setError("投稿に失敗しました。時間をおいて再試行してください。");
      // 失敗時はサーバーデータで巻き戻す
      await load();
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
          disabled={busy || !content.trim()}
        >
          {busy ? "送信中…" : "送信"}
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {comments.map((c: any) => (
          <li
            key={c.id}
            className="rounded-xl border bg-white p-3 opacity-100"
          >
            <div className="mb-1 text-xs text-gray-500">
              匿名さん・{new Date(c.createdAt).toLocaleString()}
            </div>
            <p className="prose-basic whitespace-pre-wrap text-sm">{c.content}</p>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="text-sm text-gray-500">最初のコメントを書いてみよう！</li>
        )}
      </ul>
    </section>
  );
}