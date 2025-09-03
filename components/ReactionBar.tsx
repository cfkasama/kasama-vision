"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const LIKE_KEY = (postId: string) => `p_like_${postId}`;

export default function ReactionBar({
  postId,
  likeCount,
}: {
  postId: string;
  likeCount: number;
}) {
  const router = useRouter();
  const [likes, setLikes] = useState(likeCount);
  const [busy, setBusy] = useState(false);
  const [alreadyLiked, setAlreadyLiked] = useState(false);

  // 端末内で既に「いいね」済みか復元
  useEffect(() => {
    setAlreadyLiked(sessionStorage.getItem(LIKE_KEY(postId)) === "1");
  }, [postId]);

  async function like() {
    if (busy || alreadyLiked) return;
    setBusy(true);

    // 楽観更新
    setLikes((v) => v + 1);

    try {
      // ポスト用の専用APIに分離推奨
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        // ロールバック
        setLikes((v) => Math.max(v - 1, 0));
        alert("いいねに失敗しました");
      } else {
        sessionStorage.setItem(LIKE_KEY(postId), "1");
        setAlreadyLiked(true);
      }
    } catch {
      setLikes((v) => Math.max(v - 1, 0));
      alert("通信エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  async function deletePost() {
    if (busy) return;
    const key = prompt("削除用パスワードを入力してください");
    if (key == null || !key.trim()) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteKey: key.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        alert("削除に失敗しました: " + (json?.error || res.status));
      } else {
        alert("削除しました");
        router.push("/");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex gap-3">
      <button
        onClick={like}
        disabled={busy || alreadyLiked}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
        title={alreadyLiked ? "この端末では既にいいね済みです" : "いいね"}
      >
        👍 いいね {likes}
      </button>

      <button
        onClick={deletePost}
        disabled={busy}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 disabled:opacity-50"
      >
        🗑️ 削除
      </button>
    </div>
  );
}