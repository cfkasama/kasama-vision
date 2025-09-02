"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReactionBar({
  postId,
  likeCount,
}: {
  postId: string;
  likeCount: number;
}) {
  const [likes, setLikes] = useState(likeCount);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function react(type: "LIKE" | "RECOMMEND") {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, type }),
      });
      if (res.status === 409) return;
      if (res.ok) setLikes((l) => l + 1);
    } finally {
      setBusy(false);
    }
  }

  async function deletePost() {
    const key = prompt("削除用パスワードを入力してください");
    if (!key) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteKey: key }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        alert("削除に失敗しました: " + (json?.error || res.status));
      } else {
        alert("削除しました");
        router.push("/"); // トップページへ戻す
      }
    } catch (e) {
      alert("通信エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex gap-3">
      <button
        onClick={() => react("LIKE")}
        disabled={busy}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
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