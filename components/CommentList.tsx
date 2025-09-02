// components/CommentList.tsx
"use client";
import { useEffect, useState } from "react";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  recCount: number;
};

export default function CommentList({ postId, siteKey }: { postId: string; siteKey: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<{ [cid: string]: boolean }>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 1800);
  }

  async function load() {
    const r = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
    const j = await r.json();
    setComments(j.comments || []);
  }
  useEffect(() => {
    load();
  }, [postId]);

  async function submit(e: any) {
    e.preventDefault();
    if (!content.trim()) return;

    setBusy(true);
    try {
      // コメント投稿は reCAPTCHA 必須
      // @ts-ignore
      const grecaptcha = (window as any).grecaptcha;
      if (!grecaptcha?.ready) {
        showToast("error", "reCAPTCHA読み込み中。少し待って再試行してください。");
        return;
      }
      await grecaptcha.ready();
      const token = await grecaptcha.execute(siteKey, { action: "submit_comment" });

      const r = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, recaptchaToken: token }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "post_failed");

      setContent("");
      await load();
      showToast("success", "コメントを投稿しました");
    } catch (err: any) {
      showToast("error", "コメント投稿に失敗しました");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function act(cid: string, kind: "like" | "recommend") {
    if (acting[cid]) return;
    setActing((m) => ({ ...m, [cid]: true }));
    try {
      const r = await fetch(`/api/comments/${cid}/${kind}`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "act_failed");
      await load();
      showToast("success", kind === "like" ? "いいねしました" : "推薦しました");
    } catch (e) {
      showToast("error", "操作に失敗しました");
      console.error(e);
    } finally {
      setActing((m) => ({ ...m, [cid]: false }));
    }
  }

  return (
    <section className="mt-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-white shadow ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <h4 className="mb-2 text-lg font-semibold">コメント</h4>

      <form onSubmit={submit} className="mb-3 space-y-2">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="気づき・応援・補足など"
          className="w-full rounded-md border p-2"
        />
        <button
          className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "送信中…" : "送信"}
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border bg-white p-3">
            <div className="mb-1 text-xs text-gray-500">
              匿名さん・{new Date(c.createdAt).toLocaleString()}
            </div>
            <p className="prose-basic text-sm whitespace-pre-wrap">{c.content}</p>
            <div className="mt-2 flex gap-2 text-sm">
              <button
                onClick={() => act(c.id, "like")}
                disabled={!!acting[c.id]}
                className="rounded-full border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-50"
              >
                👍 いいね（{c.likeCount ?? 0}）
              </button>
              <button
                onClick={() => act(c.id, "recommend")}
                disabled={!!acting[c.id]}
                className="rounded-full border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-50"
              >
                ⭐ 推薦（{c.recCount ?? 0}）
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}