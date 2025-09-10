// components/CommentComposer.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Kind = "COMMENT" | "CHALLENGE" | "ACHIEVED";

export default function CommentComposer({ postId }: { postId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [deleteKey, setDeleteKey] = useState("");
  const [kind, setKind] = useState<Kind>("COMMENT");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const len = content.length;
  const over = len > 2000;

  // grecaptcha v2/v3 どちらでもトークンを頑張って取得してみる
  async function getRecaptchaToken(): Promise<string> {
    try {
      // v2 (rendered widget)
      const v2 = (window as any).grecaptcha?.getResponse?.();
      if (typeof v2 === "string" && v2.length > 0) return v2;

      // v3（サイトキーがある場合）
      const grecaptcha = (window as any).grecaptcha;
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY;
      if (grecaptcha?.execute && siteKey) {
        await grecaptcha.ready?.();
        const v3 = await grecaptcha.execute(siteKey, { action: "comment" });
        if (typeof v3 === "string" && v3.length > 0) return v3;
      }
    } catch {}
    return "";
  }

  async function submit() {
    if (busy) return;
    setMsg("");

    if (!content.trim()) {
      setMsg("本文は必須です。");
      return;
    }
    if (over) {
      setMsg("本文が長すぎます（2000文字以内）。");
      return;
    }
    if (!deleteKey.trim()) {
      setMsg("削除用パスワードは必須です。");
      return;
    }

    setBusy(true);
    try {
      const recaptchaToken = await getRecaptchaToken();
      const r = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          deleteKey,
          kind,                // "COMMENT" | "CHALLENGE" | "ACHIEVED"
          recaptchaToken,      // サーバで verifyRecaptcha 実行
        }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j?.ok) {
        if (j?.error === "recaptcha") {
          setMsg("reCAPTCHA の検証に失敗しました。ページを再読み込みして再度お試しください。");
        } else if (j?.error === "content_too_long") {
          setMsg("本文が長すぎます（2000文字以内）。");
        } else if (j?.error === "deleteKey_required") {
          setMsg("削除用パスワードは必須です。");
        } else {
          setMsg("送信に失敗しました。時間をおいて再度お試しください。");
        }
        return;
      }

      // 成功
      setContent("");
      setDeleteKey("");
      try { (window as any).grecaptcha?.reset?.(); } catch {}
      router.refresh(); // サーバー側の CommentList を即時反映
    } catch {
      setMsg("ネットワークエラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = useMemo(() => {
    return !!content.trim() && !!deleteKey.trim() && !over && !busy;
  }, [content, deleteKey, over, busy]);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex gap-3 text-sm">
        <label className="inline-flex items-center gap-1">
          <input
            type="radio"
            name="kind"
            value="COMMENT"
            checked={kind === "COMMENT"}
            onChange={() => setKind("COMMENT")}
          />
          通常
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="radio"
            name="kind"
            value="CHALLENGE"
            checked={kind === "CHALLENGE"}
            onChange={() => setKind("CHALLENGE")}
          />
          挑戦中
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="radio"
            name="kind"
            value="ACHIEVED"
            checked={kind === "ACHIEVED"}
            onChange={() => setKind("ACHIEVED")}
          />
          実現
        </label>
      </div>

      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full rounded border p-2 text-[15px]"
          placeholder="コメントを入力…"
        />
        <div className={`mt-1 text-xs ${over ? "text-red-600" : "text-gray-500"}`}>
          {len}/2000
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="password"
          value={deleteKey}
          onChange={(e) => setDeleteKey(e.target.value)}
          className="min-w-0 flex-1 rounded border p-2 text-sm"
          placeholder="削除用パスワード（必須・後で削除する時に使います）"
        />
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="rounded bg-blue-600 px-3 py-2 text-white text-sm disabled:opacity-60"
        >
          {busy ? "送信中…" : "送信"}
        </button>
      </div>

      {msg && <p className="text-xs text-red-600">{msg}</p>}
      <p className="text-[11px] text-gray-500">
        ※ パスワードはハッシュ化して保存します（平文は保存しません）
      </p>
    </div>
  );
}