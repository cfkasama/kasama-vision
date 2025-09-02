"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: any;
    __recaptchaScriptInjected__?: boolean;
  }
}

type Props = { postId: string; siteKey: string };

export default function CommentList({ postId, siteKey }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState<string>("");

  const pollTimer = useRef<number | null>(null);
  const timeoutTimer = useRef<number | null>(null);

  // --- コメント取得 ---
  async function load() {
    const r = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
    const j = await r.json();
    setComments(j.comments || []);
  }
  useEffect(() => { load(); }, [postId]);

  // --- reCAPTCHA スクリプト読み込み＆準備完了待ち ---
  useEffect(() => {
    if (!siteKey) {
      setRecaptchaError("reCAPTCHA のサイトキーが未設定です。");
      return;
    }

    // Script を1回だけ注入（他ページと共存できるように）
    if (!window.__recaptchaScriptInjected__) {
      const s = document.createElement("script");
      s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      s.async = true;
      s.defer = true;
      s.onerror = () => setRecaptchaError("reCAPTCHA スクリプトの読み込みに失敗しました。");
      document.head.appendChild(s);
      window.__recaptchaScriptInjected__ = true;
    }

    // grecaptcha が生えるまでポーリング（最大15秒）
    let elapsed = 0;
    pollTimer.current = window.setInterval(() => {
      if (window.grecaptcha?.ready) {
        window.clearInterval(pollTimer.current!);
        pollTimer.current = null;
        // ready 内でフラグを立てる
        window.grecaptcha.ready(() => setRecaptchaReady(true));
      } else {
        elapsed += 300;
      }
    }, 300) as unknown as number;

    timeoutTimer.current = window.setTimeout(() => {
      if (!recaptchaReady) setRecaptchaError("reCAPTCHA の初期化がタイムアウトしました。");
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    }, 15000) as unknown as number;

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      if (timeoutTimer.current) window.clearTimeout(timeoutTimer.current);
    };
  }, [siteKey]);

  // --- コメント投稿 ---
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    if (!recaptchaReady || !window.grecaptcha?.execute) {
      setRecaptchaError("reCAPTCHA 読み込み中です。数秒後に再試行してください。");
      return;
    }

    setBusy(true);
    setRecaptchaError("");

    try {
      const token: string = await window.grecaptcha.execute(siteKey, { action: "comment" });

      const r = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, recaptchaToken: token }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j?.error || "submit_failed");
      }

      setContent("");
      await load(); // 投稿後に一覧を更新
    } catch (err: any) {
      setRecaptchaError(`コメント送信に失敗しました: ${err?.message ?? err}`);
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
            className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            disabled={busy || !recaptchaReady}
          >
            {busy ? "送信中…" : recaptchaReady ? "送信" : "reCAPTCHA読み込み中…"}
          </button>
          {recaptchaError && <span className="text-sm text-red-600">{recaptchaError}</span>}
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