// components/CommentComposer.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CommentKind = "COMMENT" | "CHALLENGE" | "ACHIEVEMENT";
type PostType =
  | "CATCHPHRASE"
  | "VISION"
  | "CONSULTATION"
  | "PROPOSAL"
  | "REPORT_LIVE"
  | "REPORT_WORK"
  | "REPORT_TOURISM";

export default function CommentComposer({
  postId,
  postType,
}: {
  postId: string;
  postType: PostType;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<CommentKind>("COMMENT");
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProposal = postType === "PROPOSAL";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError("コメントを入力してください");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          content: content.trim(),
          // kind を一緒に送る（サーバ側でデフォルト COMMENT にしておけば後方互換OK）
          kind: isProposal ? kind : "COMMENT",
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "送信に失敗しました");
      }

      setContent("");
      // コメントリストの再取得
      startTransition(() => router.refresh());
    } catch (err: any) {
      setError(err.message ?? "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2">
        {isProposal && (
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CommentKind)}
            className="rounded-md border px-2 py-1 text-sm"
            aria-label="コメント種別"
          >
            <option value="COMMENT">通常コメント</option>
            <option value="CHALLENGE">挑戦中</option>
            <option value="ACHIEVEMENT">達成報告</option>
          </select>
        )}
        {!isProposal && (
          <span className="text-xs text-gray-500">通常コメント</span>
        )}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="コメントを入力…"
        className="w-full rounded-md border p-2 text-sm"
      />

      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3">
        <button
          type="submit"
          disabled={busy || isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy || isPending ? "送信中…" : "コメントを送信"}
        </button>
      </div>
    </form>
  );
}
