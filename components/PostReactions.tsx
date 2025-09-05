"use client";
import { useState } from "react";

type Props = {
  postId: string;
  likeCount: number;
  recCount: number;
  compact?: boolean; // 一覧では true 推奨
};

const LIKE_KEY = (id: string) => `p_like_${id}`;
const REC_KEY = (id: string) => `p_rec_${id}`;

export default function PostReactions({ postId, likeCount, recCount, compact = true }: Props) {
  const [likes, setLikes] = useState(likeCount);
  const [recs, setRecs] = useState(recCount);
  const [busy, setBusy] = useState<Record<"LIKE" | "RECOMMEND", boolean>>({ LIKE: false, RECOMMEND: false });
  const [pressed, setPressed] = useState<Record<"LIKE" | "RECOMMEND", boolean>>(() => ({
    LIKE: typeof window !== "undefined" && sessionStorage.getItem(LIKE_KEY(postId)) === "1",
    RECOMMEND: typeof window !== "undefined" && sessionStorage.getItem(REC_KEY(postId)) === "1",
  }));

  // トースト表示
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  async function react(type: "LIKE" | "RECOMMEND") {
    if (busy[type] || pressed[type]) return;
    setBusy((b) => ({ ...b, [type]: true }));

    // 楽観的更新
    if (type === "LIKE") setLikes((v) => v + 1);
    else setRecs((v) => v + 1);

    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, type }),
      });

      if (!res.ok && res.status !== 409) {
        // ロールバック
        if (type === "LIKE") setLikes((v) => Math.max(v - 1, 0));
        else setRecs((v) => Math.max(v - 1, 0));
        showToast("エラーが発生しました");
        return;
      }

      if (type === "LIKE") sessionStorage.setItem(LIKE_KEY(postId), "1");
      else sessionStorage.setItem(REC_KEY(postId), "1");
      setPressed((p) => ({ ...p, [type]: true }));
      showToast(type === "LIKE" ? "いいねしました" : "推薦しました");
    } catch {
      if (type === "LIKE") setLikes((v) => Math.max(v - 1, 0));
      else setRecs((v) => Math.max(v - 1, 0));
      showToast("通信エラーが発生しました");
    } finally {
      setBusy((b) => ({ ...b, [type]: false }));
    }
  }

  const btnBase =
    "rounded-full border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60 inline-flex items-center gap-1";

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => react("LIKE")}
          disabled={busy.LIKE || pressed.LIKE}
          className={btnBase}
          aria-label="いいね"
          title={pressed.LIKE ? "この端末では既にいいね済み" : "いいね"}
        >
          {busy.LIKE ? "⏳" : "👍"} <span>{likes}</span>
        </button>
        <button
          onClick={() => react("RECOMMEND")}
          disabled={busy.RECOMMEND || pressed.RECOMMEND}
          className={btnBase}
          aria-label="推薦"
          title={pressed.RECOMMEND ? "この端末では既に推薦済み" : "推薦"}
        >
          {busy.RECOMMEND ? "⏳" : "⭐"} <span>{recs}</span>
        </button>
      </div>

      {/* 簡易トースト */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/80 px-3 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </>
  );
}