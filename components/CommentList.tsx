"use client";
import { useEffect, useMemo, useState } from "react";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  recCount?: number;        // ないとき用に0で補完
  postId: string;
  identityId: string | null;
};

export default function CommentList({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  // アクション中のコメントIDを保持して二重連打を防止
  const [acting, setActing] = useState<Record<string, boolean>>({});
  // 簡易トースト
  const [toast, setToast] = useState<string>("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  async function load() {
    const r = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
    const j = await r.json();
    const list: Comment[] = (j.comments || []).map((c: any) => ({
      recCount: 0,
      ...c,
    }));
    setComments(list);
  }

  useEffect(() => {
    load();
  }, [postId]);

  // コメント投稿（reCAPTCHA 必須）
  async function submit(e: any) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);

    try {
      // @ts-ignore
      const grecaptcha = (window as any)?.grecaptcha;
      if (!grecaptcha?.execute) {
        showToast("reCAPTCHAの初期化を待っています。少し待って再実行してください。");
        setBusy(false);
        return;
      }
      const token = await grecaptcha.execute(
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
        { action: "comment" }
      );

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, recaptchaToken: token }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        showToast("コメント投稿に失敗しました");
        setBusy(false);
        return;
      }
      setContent("");
      showToast("コメントを投稿しました");
      await load(); // 投稿後に一覧を更新
    } catch (e) {
      showToast("コメント投稿でエラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  // いいね
  const like = async (id: string) => {
    if (acting[id]) return;
    setActing((m) => ({ ...m, [id]: true }));
    // 楽観的更新
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, likeCount: c.likeCount + 1 } : c))
    );
    try {
      const r = await fetch(`/api/comments/${id}/like`, { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        // ロールバック
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, likeCount: c.likeCount - 1 } : c))
        );
        showToast("いいねに失敗しました");
      } else {
        showToast("いいねしました");
      }
    } catch {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, likeCount: c.likeCount - 1 } : c))
      );
      showToast("いいねでエラーが発生しました");
    } finally {
      setActing((m) => ({ ...m, [id]: false }));
    }
  };

  // 推薦
  const recommend = async (id: string) => {
    if (acting[id]) return;
    setActing((m) => ({ ...m, [id]: true }));
    // 楽観的更新（recCount が undefined の場合は0扱い）
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, recCount: (c.recCount ?? 0) + 1 } : c
      )
    );
    try {
      const r = await fetch(`/api/comments/${id}/recommend`, { method: "POST" });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        // ロールバック
        setComments((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, recCount: Math.max((c.recCount ?? 1) - 1, 0) } : c
          )
        );
        showToast("推薦に失敗しました");
      } else {
        showToast("推薦しました");
      }
    } catch {
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

  return (
    <section className="mt-6">
      <h4 className="mb-2 text-lg font-semibold">コメント</h4>

      <form onSubmit={submit} className="mb-3 space-y-2">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="気づき・応援・補足など"
          className="w-full rounded-md border p-2"
        />
        <button
          className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "送信中…" : "送信"}
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border bg-white p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>匿名さん・{new Date(c.createdAt).toLocaleString()}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => like(c.id)}
                  disabled={!!acting[c.id]}
                  className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-60"
                  aria-label="いいね"
                >
                  👍 {c.likeCount}
                </button>
                <button
                  onClick={() => recommend(c.id)}
                  disabled={!!acting[c.id]}
                  className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-60"
                  aria-label="推薦"
                >
                  ⭐ {(c.recCount ?? 0)}
                </button>
              </div>
            </div>
            <p className="prose-basic text-sm">{c.content}</p>
          </li>
        ))}
      </ul>

      {/* 簡易トースト */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/80 px-3 py-2 text-xs text-white">
          {toast}
        </div>
      )}
    </section>
  );
}