"use client";
import { useEffect, useState } from "react";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  recCount?: number;
  postId: string;
  identityId: string | null;
};

const LIKE_KEY = (id: string) => `c_like_${id}`;
const REC_KEY  = (id: string) => `c_rec_${id}`;

export default function CommentList({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [deleteKey, setDeleteKey] = useState("");
  const [busy, setBusy] = useState(false);

  // acting を { commentId: "like" | "rec" | "report" | "delete" | null } で管理
  const [acting, setActing] = useState<Record<string, string | null>>({});
  const [pressedLike, setPressedLike] = useState<Record<string, boolean>>({});
  const [pressedRec, setPressedRec] = useState<Record<string, boolean>>({});

  const [toast, setToast] = useState<string>("");
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  async function load() {
    try {
      const r = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error("fetch_failed");

      const list: Comment[] = (j.comments || []).map((c: any) => ({
        recCount: 0,
        ...c,
      }));
      setComments(list);

      const likeMap: Record<string, boolean> = {};
      const recMap: Record<string, boolean> = {};
      list.forEach((c) => {
        likeMap[c.id] = sessionStorage.getItem(LIKE_KEY(c.id)) === "1";
        recMap[c.id] = sessionStorage.getItem(REC_KEY(c.id)) === "1";
      });
      setPressedLike(likeMap);
      setPressedRec(recMap);
    } catch {
      showToast("コメント取得に失敗しました");
    }
  }

  useEffect(() => {
    load();
  }, [postId]);

  // いいね
  const like = async (id: string) => {
    if (pressedLike[id]) {
      showToast("この端末では既に『いいね』済みです");
      return;
    }
    if (acting[id]) return;
    setActing((m) => ({ ...m, [id]: "like" }));

    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, likeCount: c.likeCount + 1 } : c))
    );

    try {
      const r = await fetch(`/api/comments/${id}/like`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, likeCount: Math.max(c.likeCount - 1, 0) } : c))
        );
        showToast("いいねに失敗しました");
      } else {
        sessionStorage.setItem(LIKE_KEY(id), "1");
        setPressedLike((m) => ({ ...m, [id]: true }));
        showToast("いいねしました");
      }
    } catch {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, likeCount: Math.max(c.likeCount - 1, 0) } : c))
      );
      showToast("いいねでエラーが発生しました");
    } finally {
      setActing((m) => ({ ...m, [id]: null }));
    }
  };

  // 推薦
  const recommend = async (id: string) => {
    if (pressedRec[id]) {
      showToast("この端末では既に『推薦』済みです");
      return;
    }
    if (acting[id]) return;
    setActing((m) => ({ ...m, [id]: "rec" }));

    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, recCount: (c.recCount ?? 0) + 1 } : c))
    );

    try {
      const r = await fetch(`/api/comments/${id}/recommend`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, recCount: Math.max((c.recCount ?? 1) - 1, 0) } : c))
        );
        showToast("推薦に失敗しました");
      } else {
        sessionStorage.setItem(REC_KEY(id), "1");
        setPressedRec((m) => ({ ...m, [id]: true }));
        showToast("推薦しました");
      }
    } catch {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, recCount: Math.max((c.recCount ?? 1) - 1, 0) } : c))
      );
      showToast("推薦でエラーが発生しました");
    } finally {
      setActing((m) => ({ ...m, [id]: null }));
    }
  };

  // --- 中略: report, removeComment は acting を "report" / "delete" に変更して同じように使える ---

  return (
    <section className="mt-6">
      <ul className="flex flex-col gap-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border bg-white p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>匿名さん・{new Date(c.createdAt).toLocaleString()}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => like(c.id)}
                  disabled={!!acting[c.id] || !!pressedLike[c.id]}
                  className="rounded-full border px-2 py-0.5 text-xs"
                >
                  {acting[c.id] === "like" ? "⏳" : "👍"} {c.likeCount}
                </button>
                <button
                  onClick={() => recommend(c.id)}
                  disabled={!!acting[c.id] || !!pressedRec[c.id]}
                  className="rounded-full border px-2 py-0.5 text-xs"
                >
                  {acting[c.id] === "rec" ? "⏳" : "⭐"} {c.recCount ?? 0}
                </button>
                {/* report / delete も acting[c.id] === "report"/"delete" で ⏳ 表示可能 */}
              </div>
            </div>
            <p className="prose-basic text-sm">{c.content}</p>
          </li>
        ))}
      </ul>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/80 px-3 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </section>
  );
}