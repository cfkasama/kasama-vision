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

export default function CommentList({ postId }:{ postId:string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent]   = useState("");
  const [deleteKey, setDeleteKey] = useState("");  // ← 追加：投稿時に必須
  const [busy, setBusy]         = useState(false);

  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [pressedLike, setPressedLike] = useState<Record<string, boolean>>({});
  const [pressedRec,  setPressedRec]  = useState<Record<string, boolean>>({});

  const [toast, setToast] = useState<string>("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""), 1800); };

  async function load() {
    const r = await fetch(`/api/posts/${postId}/comments`, { cache: "no-store" });
    const j = await r.json();
    const list: Comment[] = (j.comments || []).map((c: any) => ({ recCount: 0, ...c }));
    setComments(list);

    const likeMap: Record<string, boolean> = {};
    const recMap: Record<string, boolean>  = {};
    list.forEach((c) => {
      likeMap[c.id] = sessionStorage.getItem(LIKE_KEY(c.id)) === "1";
      recMap[c.id]  = sessionStorage.getItem(REC_KEY(c.id))  === "1";
    });
    setPressedLike(likeMap);
    setPressedRec(recMap);
  }
  useEffect(()=>{ load(); }, [postId]);

  // コメント投稿（deleteKey 必須 & reCAPTCHA 必須）
  async function submit(e:any) {
    e.preventDefault();
    if (!content.trim()) return showToast("本文を入力してください");
    if (!deleteKey.trim()) return showToast("削除用パスワードを入力してください");
    setBusy(true);
    try {
      // @ts-ignore
      const grecaptcha = (window as any)?.grecaptcha;
      if (!grecaptcha?.execute) {
        showToast("reCAPTCHAの初期化待ちです。少し待って再実行してください。");
        setBusy(false);
        return;
      }
      const token = await grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!, { action: "comment" });

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ content, deleteKey, recaptchaToken: token })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        showToast("コメント投稿に失敗しました");
        setBusy(false);
        return;
      }
      setContent("");
      setDeleteKey("");
      showToast("コメントを投稿しました");
      await load();
    } catch {
      showToast("コメント投稿でエラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  // いいね
  async function like(id:string) { /* ここはあなたの現行のままでOK */ }

  // 推薦
  async function recommend(id:string) { /* ここも現行のままでOK */ }

  // 通報
  async function report(c: Comment) { /* 現行のままでOK */ }

  // コメント削除（投稿者がパスワードで消す）
  async function removeComment(id: string) {
    const key = prompt("このコメントの削除用パスワードを入力してください");
    if (key === null) return;
    if (!key.trim()) return showToast("パスワードを入力してください");

    try {
      const r = await fetch(`/api/comments/${id}/delete`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ deleteKey: key.trim() })
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || !j?.ok) {
        showToast("削除に失敗しました（パスワード不一致の可能性）");
      } else {
        showToast("削除しました");
        await load();
      }
    } catch {
      showToast("削除でエラーが発生しました");
    }
  }

  return (
    <section className="mt-6">
      <h4 className="mb-2 text-lg font-semibold">コメント</h4>

      <form onSubmit={submit} className="mb-3 space-y-2">
        <textarea
          rows={3}
          value={content}
          onChange={(e)=>setContent(e.target.value)}
          placeholder="気づき・応援・補足など"
          className="w-full rounded-md border p-2"
        />
        <input
          type="password"
          value={deleteKey}
          onChange={(e)=>setDeleteKey(e.target.value)}
          placeholder="削除用パスワード（必須・後から削除に使います）"
          className="w-full rounded-md border p-2"
          required
        />
        <button
          className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "送信中…" : "送信"}
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {comments.map((c)=>(
          <li key={c.id} className="rounded-xl border bg-white p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>匿名さん・{new Date(c.createdAt).toLocaleString()}</span>
              <div className="flex items-center gap-2">
                <button /* いいね */  onClick={()=>like(c.id)} className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50">👍 {c.likeCount}</button>
                <button /* 推薦 */    onClick={()=>recommend(c.id)} className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50">⭐ {(c.recCount ?? 0)}</button>
                <button /* 通報 */    onClick={()=>report(c)} className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50">🚩 通報</button>
                <button /* 削除 */    onClick={()=>removeComment(c.id)} className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50">🗑️ 削除</button>
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