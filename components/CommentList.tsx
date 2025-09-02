// コメントフォームのファイル（例: components/CommentList.tsx）
"use client";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: any;
    __recaptchaReady__?: boolean;
  }
}

type Props = { postId: string; siteKey: string };

export default function CommentList({ postId, siteKey }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function load() {
    const r = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
    const j = await r.json();
    setComments(j.comments || []);
  }
  useEffect(() => { load(); }, [postId]);

  async function getTokenWithRetry(max = 5): Promise<string> {
    for (let i = 0; i < max; i++) {
      if (window.__recaptchaReady__ && window.grecaptcha?.execute) {
        try {
          return await window.grecaptcha.execute(siteKey, { action: "comment" });
        } catch (e) {
          console.warn("[reCAPTCHA] execute 失敗、再試行します...", e);
        }
      } else {
        console.log("[reCAPTCHA] ready待ち中...", i + 1);
      }
      await new Promise((r) => setTimeout(r, 500 + i * 300));
    }
    throw new Error("reCAPTCHA の準備ができていません");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!content.trim()) return;

    try {
      setBusy(true);
      const token = await getTokenWithRetry(8);

      const r = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, recaptchaToken: token }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || "submit_failed");

      setContent("");
      await load();
      setMsg("コメントを投稿しました。");
    } catch (err: any) {
      setMsg(`コメント送信に失敗: ${err?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || !window.__recaptchaReady__;

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
            className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            disabled={disabled}
            title={!window.__recaptchaReady__ ? "reCAPTCHA読み込み中…" : ""}
          >
            {busy ? "送信中…" : window.__recaptchaReady__ ? "送信" : "reCAPTCHA読み込み中…"}
          </button>
          {msg && <span className="text-sm text-gray-700">{msg}</span>}
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {comments.map((c: any) => (
          <li key={c.id} className="rounded-xl border bg-white p-3">
            <div className="mb-1 text-xs text-gray-500">
              匿名さん・{new Date(c.createdAt).toLocaleString()}
            </div>
            <p className="prose-basic text-sm whitespace-pre-wrap">{c.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}