"use client";
import { useEffect, useState } from "react";

type Props = {
  postId: string;
  likeCount: number;
  compact?: boolean; // 一覧では true 推奨
};

const LIKE_KEY = (id: string) => `p_like_${id}`;

export default function PostReactions({ postId, likeCount, compact = true }: Props) {
  const [likes, setLikes] = useState(likeCount);
  const [busy, setBusy] = useState(false);
  const [pressed, setPressed] = useState(false);

  // 初回マウント時に「この端末で既にいいね済みか」を復元
  useEffect(() => {
    try {
      setPressed(sessionStorage.getItem(LIKE_KEY(postId)) === "1");
    } catch {
      /* noop */
    }
  }, [postId]);

  // 簡易トースト
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  async function like() {
    if (busy || pressed) return;

    setBusy(true);
    // 楽観的更新
    setLikes((v) => v + 1);

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const json = await res.json().catch(() => ({} as any));

      if (res.status === 409) {
        // もしサーバが重複押下を409で返す実装ならここでロールバック
        setLikes((v) => Math.max(v - 1, 0));
        try { sessionStorage.setItem(LIKE_KEY(postId), "1"); } catch {}
        setPressed(true);
        showToast("この端末では既にいいね済みです");
        return;
      }

      if (!res.ok || !json?.ok) {
        // 失敗 → ロールバック
        setLikes((v) => Math.max(v - 1, 0));
        showToast("エラーが発生しました");
        return;
      }

      // サーバが likeCount を返すならそれを採用（ズレ補正）
      if (typeof json.likeCount === "number") {
        setLikes(json.likeCount);
      }

      try { sessionStorage.setItem(LIKE_KEY(postId), "1"); } catch {}
      setPressed(true);
      showToast("いいねしました");
    } catch {
      // 通信エラー → ロールバック
      setLikes((v) => Math.max(v - 1, 0));
      showToast("通信エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  const btnBase =
    "rounded-full border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60 inline-flex items-center gap-1";

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={like}
          disabled={busy || pressed}
          aria-busy={busy}
          className={btnBase}
          aria-label="いいね"
          title={pressed ? "この端末では既にいいね済み" : "いいね"}
        >
          {busy ? "⏳" : "👍"}
          <span>{likes}</span>
          {!compact && <span className="ml-1">いいね</span>}
        </button>
      </div>

      {/* トースト */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/80 px-3 py-2 text-xs text-white"
        >
          {toast}
        </div>
      )}
    </>
  );
}