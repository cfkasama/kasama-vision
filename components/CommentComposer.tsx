// components/CommentComposer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PostType =
  | "CATCHPHRASE"
  | "VISION"
  | "CONSULTATION"
  | "PROPOSAL"
  | "REPORT_LIVE"
  | "REPORT_WORK"
  | "REPORT_TOURISM";

type Kind = "COMMENT" | "CHALLENGE" | "ACHIEVED";

export default function CommentComposer({
  postId,
  postType,
}: {
  postId: string;
  postType: PostType;
}) {
  const router = useRouter();
  const isProposal = postType === "PROPOSAL";

  const [content, setContent] = useState("");
  const [deleteKey, setDeleteKey] = useState("");
  const [kind, setKind] = useState<Kind>(isProposal ? "COMMENT" : "COMMENT");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // 提案以外のときは常に COMMENT にロック
  useEffect(() => {
    if (!isProposal) setKind("COMMENT");
  }, [isProposal]);

  const len = content.length;
  const over = len > 2000;

  // reCAPTCHA v3 専用
  async function getRecaptchaV3Token(): Promise<string> {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
    const grecaptcha = (window as any).grecaptcha;

    if (!siteKey) {
      throw new Error("reCAPTCHA site key is not set (NEXT_PUBLIC_RECAPTCHA_KEY).");
    }
    if (!grecaptcha?.execute) {
      // <Script src="https://www.google.com/recaptcha/api.js?render=SITE_KEY" /> を読み込んでおくこと
      throw new Error("grecaptcha v3 is not loaded.");
    }
    await grecaptcha.ready?.();
    const token = await grecaptcha.execute(siteKey, { action: "comment_submit" });
    return String(token ?? "");
  }

  async function submit() {
    if (busy) return;
    setMsg("");

    if (!content.trim()) return setMsg("本文は必須です。");
    if (over) return setMsg("本文が長すぎます（2000文字以内）。");
    if (!deleteKey.trim()) return setMsg("削除用パスワードは必須です。");

    setBusy(true);
    try {
      const recaptchaToken = await getRecaptchaV3Token();

      // 提案以外はサーバー側でも COMMENT にフォールバックされますが、念のためクライアントでも制御
      const effectiveKind: Kind = isProposal ? kind : "COMMENT";

      const r = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          deleteKey,
          kind: effectiveKind,
          recaptchaToken,
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        const e = j?.error;
        if (e === "recaptcha") setMsg("reCAPTCHA の検証に失敗しました。時間をおいて再度お試しください。");
        else if (e === "content_too_long") setMsg("本文が長すぎます（2000文字以内）。");
        else if (e === "deleteKey_required") setMsg("削除用パスワードは必須です。");
        else setMsg("送信に失敗しました。時間をおいて再度お試しください。");
        return;
      }

      // 成功
      setContent("");
      setDeleteKey("");
      try {
        (window as any).grecaptcha?.reset?.(); // v3 は no-op
      } catch {}
      router.refresh();
    } catch (err: any) {
      setMsg(err?.message ?? "ネットワークエラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = useMemo(
    () => !!content.trim() && !!deleteKey.trim() && !over && !busy,
    [content, deleteKey, over, busy]
  );

  return (
    <div className="rounded-lg border p-3 space-y-2">
      {isProposal ? (
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
      ) : (
        <p className="text-xs text-gray-500">※ この投稿タイプでは通常コメントのみ対応</p>
      )}

      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full rounded border p-2 text-[15px]"
          placeholder="コメントを入力…"
        />
        <div className={`mt-1 text-xs ${over ? "text-red-600" : "text-gray-500"}`}>{len}/2000</div>
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
      <p className="text-[11px] text-gray-500">※ パスワードはハッシュ化して保存します（平文は保存しません）</p>
    </div>
  );
}
