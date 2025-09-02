"use client";
import { useEffect, useMemo, useState, useCallback } from "react";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  recCount: number;
};

type Toast = { id: number; message: string; type?: "info" | "success" | "error" };

// reCAPTCHA 実行（v3）
async function getRecaptchaToken(action: string) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
  // window.grecaptcha を待つ
  function waitReady() {
    return new Promise<void>((resolve, reject) => {
      let tries = 0;
      const timer = setInterval(() => {
        // @ts-ignore
        if (window.grecaptcha?.ready) {
          clearInterval(timer);
          // @ts-ignore
          window.grecaptcha.ready(resolve);
        } else if (++tries > 50) {
          clearInterval(timer);
          reject(new Error("reCAPTCHA not ready"));
        }
      }, 100);
    });
  }
  await waitReady();
  // @ts-ignore
  const token = await window.grecaptcha.execute(siteKey, { action });
  return token as string;
}

export default function CommentList({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  // クリック連打対策用：処理中コメントID集合
  const [pendingLike, setPendingLike] = useState<Record<string, boolean>>({});
  const [pendingRec, setPendingRec] = useState<Record<string, boolean>>({});

  // 既に押したことがあるか（localStorage）
  const likedMap = useMemo(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("likedComments") || "{}") as Record<string, true>;
    } catch {
      return {};
    }
  }, []);
  const recMap = useMemo(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("recommendedComments") || "{}") as Record<string, true>;
    } catch {
      return {};
    }
  }, []);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
  }, []);

  // reCAPTCHA スクリプトを読み込み（初回のみ）
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
    const id = "grecaptcha-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    s.async = true;
    document.body.appendChild(s);
    return () => {
      // ここでは削除しない（ページ内で再利用するため）
    };
  }, []);

  async function load() {
    try {
      const r = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
      const j = await r.json();
      setComments(j.comments || []);
    } catch {
      pushToast({ message: "コメント取得に失敗しました", type: "error" });
    }
  }
  useEffect(() => { load(); }, [postId]); // eslint-disable-line

  async function submit(e: any) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    try {
      const recaptchaToken = await getRecaptchaToken("comment_create");
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content, recaptchaToken }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error("create_fail");
      setContent("");
      pushToast({ message: "コメントを投稿しました", type: "success" });
      await load();
    } catch {
      pushToast({ message: "コメント投稿に失敗しました", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  function persistLS(key: "likedComments" | "recommendedComments", id: string) {
    try {
      const raw = localStorage.getItem(key);
      const map = raw ? (JSON.parse(raw) as Record<string, true>) : {};
      map[id] = true;
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  }

  async function onLike(id: string) {
    if (likedMap[id]) {
      pushToast({ message: "すでにいいね済みです", type: "info" });
      return;
    }
    if (pendingLike[id]) return;
    setPendingLike((m) => ({ ...m, [id]: true }));
    try {
      // 楽観的更新
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, likeCount: c.likeCount + 1 } : c)));

      const recaptchaToken = await getRecaptchaToken("comment_like");
      const r = await fetch(`/api/comments/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recaptchaToken }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error("like_fail");

      persistLS("likedComments", id);
      pushToast({ message: "いいねしました", type: "success" });
    } catch {
      pushToast({ message: "いいねに失敗しました", type: "error" });
      // 失敗時は戻す
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, likeCount: Math.max(0, c.likeCount - 1) } : c)));
    } finally {
      setPendingLike((m) => ({ ...m, [id]: false }));
    }
  }

  async function onRecommend(id: string) {
    if (recMap[id]) {
      pushToast({ message: "すでに推薦済みです", type: "info" });
      return;
    }
    if (pendingRec[id]) return;
    setPendingRec((m) => ({ ...m, [id]: true }));
    try {
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, recCount: c.recCount + 1 } : c)));

      const recaptchaToken = await getRecaptchaToken("comment_recommend");
      const r = await fetch(`/api/comments/${id}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recaptchaToken }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error("rec_fail");

      persistLS("recommendedComments", id);

      if (j.reachedThreshold) {
        pushToast({
          message: j.createdPostId ? "推薦が10件に到達！提案として公開されました 🎉" : "推薦が10件に到達！",
          type: "success",
        });
      } else {
        pushToast({ message: "推薦しました", type: "success" });
      }
    } catch {
      pushToast({ message: "推薦に失敗しました", type: "error" });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, recCount: Math.max(0, c.recCount - 1) } : c)));
    } finally {
      setPendingRec((m) => ({ ...m, [id]: false }));
    }
  }

  return (
    <section className="mt-6">
      {/* Toast */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md px-3 py-2 text-sm text-white shadow
              ${t.type === "error" ? "bg-red-600" : t.type === "success" ? "bg-green-600" : "bg-gray-800"}`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <h4 className="mb-2 text-lg font-semibold">コメント</h4>

      <form onSubmit={submit} className="mb-3 space-y-2">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="気づき・応援・補足など"
          className="w-full rounded-md border p-2"
        />
        <button className="rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50" disabled={busy}>
          {busy ? "送信中…" : "送信"}
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border bg-white p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>匿名さん・{new Date(c.createdAt).toLocaleString()}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onLike(c.id)}
                  className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                  aria-label="いいね"
                  disabled={pendingLike[c.id] || !!likedMap[c.id]}
                  title={likedMap[c.id] ? "すでにいいね済み" : ""}
                >
                  👍 {c.likeCount}
                </button>
                <button
                  onClick={() => onRecommend(c.id)}
                  className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                  aria-label="推薦"
                  disabled={pendingRec[c.id] || !!recMap[c.id]}
                  title={recMap[c.id] ? "すでに推薦済み" : ""}
                >
                  ⭐ {c.recCount}
                </button>
              </div>
            </div>
            <p className="prose-basic whitespace-pre-wrap text-sm">{c.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}