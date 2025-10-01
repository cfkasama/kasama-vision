"use client";
import { useEffect, useState } from "react";

type Kind = "COMMENT" | "CHALLENGE" | "ACHIEVED";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  recCount?: number;
  postId: string;
  identityId: string | null;
  kind?: Kind; // バッジ表示用
};

const LIKE_KEY = (id: string) => `c_like_${id}`;
const REC_KEY  = (id: string) => `c_rec_${id}`;

export default function CommentList({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [acting, setActing] = useState<Record<string, boolean>>({});
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
    } catch (e) {
      console.error("load comments failed:", e);
      showToast("コメント取得に失敗しました");
    }
  }

  // 初期ロード
  useEffect(() => {
    load();
  }, [postId]);

  // 投稿完了イベントで再読込
  useEffect(() => {
    const onCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { postId?: string } | undefined;
      if (!detail || !detail.postId || detail.postId === postId) {
        load();
      }
    };
    window.addEventListener("comment:created", onCreated as EventListener);
    return () => window.removeEventListener("comment:created", onCreated as EventListener);
  }, [postId]);

  // いいね
  const like = async (id: string) => {
    if (pressedLike[id]) {
      showToast("この端末では既に『いいね』済みです");
      return;
    }
    if (acting[id]) return;
    setActing((m) => ({ ...m, [id]: true }));

    // 楽観更新
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, likeCount: c.likeCount + 1 } : c))
    );

    try {
      const r = await fetch(`/api/comments/${id}/like`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        // ロールバック
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, likeCount: Math.max(c.likeCount - 1, 0) } : c))
        );
        showToast("いいねに失敗しました");
      } else {
        sessionStorage.setItem(LIKE_KEY(id), "1");
        setPressedLike((m) => ({ ...m, [id]: true }));
        showToast("いいねしました");
      }
    } catch (e) {
      console.error("like failed:", e);
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, likeCount: Math.max(c.likeCount - 1, 0) } : c))
      );
      showToast("いいねでエラーが発生しました");
    } finally {
      setActing((m) => ({ ...m, [id]: false }));
    }
  };

  // 推薦
  const recommend = async (id: string) => {
    if (pressedRec[id]) {
      showToast("この端末では既に『推薦』済みです");
      return;
    }
    if (acting[id]) return;
    setActing((m) => ({ ...m, [id]: true }));

    // 楽観更新
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, recCount: (c.recCount ?? 0) + 1 } : c))
    );

    try {
      const r = await fetch(`/api/comments/${id}/recommend`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        // ロールバック
        setComments((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, recCount: Math.max((c.recCount ?? 1) - 1, 0) } : c
          )
        );
        showToast("推薦に失敗しました");
      } else {
        sessionStorage.setItem(REC_KEY(id), "1");
        setPressedRec((m) => ({ ...m, [id]: true }));
        showToast("推薦しました");
      }
    } catch (e) {
      console.error("recommend failed:", e);
      setComments((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, recCount: Math.max((c.recCount ?? 1) - 1, 0) } : c
        )
      );
      showToast("推薦でエラーが発生しました");
    } finally {
      setActing((m) => ({ ...m, [id]: false }));
    }
  };

  // 通報
  const report = async (c: Comment) => {
    const reason = prompt("通報理由を入力してください（任意）", "");
    if (reason === null) return;

    try {
      const r = await fetch(`/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: c.postId,
          commentId: c.id,
          reason: "COMMENT",
          note: reason || "",
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        showToast("通報に失敗しました");
      } else {
        showToast("通報しました。ご協力ありがとうございます");
      }
    } catch (e) {
      console.error("report failed:", e);
      showToast("通報でエラーが発生しました");
    }
  };

  // 削除
  async function removeComment(id: string) {
    const key = prompt("このコメントの削除用パスワードを入力してください");
    if (key === null) return;
    if (!key.trim()) return showToast("パスワードを入力してください");

    try {
      const r = await fetch(`/api/comments/${id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteKey: key.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        showToast("削除に失敗しました（パスワード不一致の可能性）");
      } else {
        showToast("削除しました");
        await load();
      }
    } catch (e) {
      console.error("delete failed:", e);
      showToast("削除でエラーが発生しました");
    }
  }

  // 種別バッジ
  const KindBadge = ({ kind }: { kind?: Kind }) => {
    if (!kind || kind === "COMMENT") return null;
    const isChallenge = kind === "CHALLENGE";
    return (
      <span
        className={[
          "mr-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px]",
          isChallenge ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700",
        ].join(" ")}
      >
        {isChallenge ? "挑戦中" : "実現"}
      </span>
    );
  };

  return (
    <section className="mt-6">
      <h4 className="mb-2 text-lg font-semibold">コメント</h4>

      <ul className="flex flex-col gap-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border bg-white p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <KindBadge kind={c.kind} />
                <span>匿名さん・{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => like(c.id)}
                  disabled={!!acting[c.id] || !!pressedLike[c.id]}
                  className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-60"
                  aria-label="いいね"
                  title={pressedLike[c.id] ? "この端末では既にいいね済み" : "いいね"}
                >
                  👍 {c.likeCount}
                </button>
                {/* kind 未指定(undefined) も含めてコメント扱いにする */}
                {(!c.kind || c.kind === "COMMENT") && (
                  <button
                    onClick={() => recommend(c.id)}
                    disabled={!!acting[c.id] || !!pressedRec[c.id]}
                    className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-60"
                    aria-label="推薦"
                    title={pressedRec[c.id] ? "この端末では既に推薦済み" : "推薦"}
                  >
                    ⭐ {c.recCount ?? 0}
                  </button>
                )}
                <button
                  onClick={() => report(c)}
                  className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50"
                  aria-label="通報"
                  title="通報する"
                >
                  🚩 通報
                </button>
                <button
                  onClick={() => removeComment(c.id)}
                  className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50"
                >
                  🗑️ 削除
                </button>
              </div>
            </div>
            <p className="prose-basic text-sm whitespace-pre-wrap">{c.content}</p>
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