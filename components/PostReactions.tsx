
"use client";
import { useState } from "react";

type Props = {
  postId: string;
  likeCount: number;
  recCount: number;
  compact?: boolean; // 一覧では true 推奨
};

const LIKE_KEY = (id: string) => `p_like_${id}`;
const REC_KEY  = (id: string) => `p_rec_${id}`;

export default function PostReactions({ postId, likeCount, recCount, compact = true }: Props) {
  const [likes, setLikes] = useState<number>(() => {
    const pressed = typeof window !== "undefined" && sessionStorage.getItem(LIKE_KEY(postId)) === "1";
    // 既に押してた場合でもカウントは初期値のままでOK（サーバ値の表示）
    return likeCount;
  });
  const [recs, setRecs] = useState<number>(() => recCount);
  const [busy, setBusy] = useState<Record<"LIKE" | "RECOMMEND", boolean>>({ LIKE: false, RECOMMEND: false });
  const [pressed, setPressed] = useState<Record<"LIKE" | "RECOMMEND", boolean>>(() => ({
    LIKE: typeof window !== "undefined" && sessionStorage.getItem(LIKE_KEY(postId)) === "1",
    RECOMMEND: typeof window !== "undefined" && sessionStorage.getItem(REC_KEY(postId)) === "1",
  }));

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
      const ok = res.ok;
      // 409（すでに押している等）でも「押し済み扱い」に倒す
      if (!ok && res.status !== 409) {
        // ロールバック
        if (type === "LIKE") setLikes((v) => Math.max(v - 1, 0));
        else setRecs((v) => Math.max(v - 1, 0));
        return;
      }
      // 押し済み記録
      if (type === "LIKE") sessionStorage.setItem(LIKE_KEY(postId), "1");
      else sessionStorage.setItem(REC_KEY(postId), "1");
      setPressed((p) => ({ ...p, [type]: true }));
    } catch {
      // 失敗時ロールバック
      if (type === "LIKE") setLikes((v) => Math.max(v - 1, 0));
      else setRecs((v) => Math.max(v - 1, 0));
    } finally {
      setBusy((b) => ({ ...b, [type]: false }));
    }
  }

  const btnBase =
    "rounded-full border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60 inline-flex items-center gap-1";

  if (compact) {
    // 一覧向け：小さめ横並び
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => react("LIKE")}
          disabled={busy.LIKE || pressed.LIKE}
          className={btnBase}
          aria-label="いいね"
          title={pressed.LIKE ? "この端末では既にいいね済み" : "いいね"}
        >
          👍 <span>{likes}</span>
        </button>
        <button
          onClick={() => react("RECOMMEND")}
          disabled={busy.RECOMMEND || pressed.RECOMMEND}
          className={btnBase}
          aria-label="推薦"
          title={pressed.RECOMMEND ? "この端末では既に推薦済み" : "推薦"}
        >
          ⭐ <span>{recs}</span>
        </button>
      </div>
    );
  }

  // 詳細向け（未使用でも一応）
  return (
    <div className="mt-2 flex gap-3">
      <button
        onClick={() => react("LIKE")}
        disabled={busy.LIKE || pressed.LIKE}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        👍 いいね {likes}
      </button>
      <button
        onClick={() => react("RECOMMEND")}
        disabled={busy.RECOMMEND || pressed.RECOMMEND}
        className="rounded-lg bg-yellow-500 px-3 py-1.5 text-white hover:bg-yellow-600 disabled:opacity-50"
      >
        ⭐ 推薦 {recs}
      </button>
    </div>
  );
}