"use client";
import { useEffect, useState,Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
export const dynamic='force-dynamic';

const TYPES = [
  ["CONSULTATION","相談"],["PROPOSAL","提案"],
  ["CATCHPHRASE","キャッチ"],["VISION","ビジョン"],
  ["REPORT_LIVE","住めなかった報告"],["REPORT_WORK","働けなかった報告"],["REPORT_TOURISM","不満がある報告"]
];

export default function NewPostPage() {
  const sp = useSearchParams(); const router = useRouter();
  const [type, setType] = useState(sp.get("type") || "CONSULTATION");
  const [title, setTitle] = useState(sp.get("draft") || "");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState(sp.get("tags") || "");
  const [deleteKey, setDeleteKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,setError] = useState("");

  useEffect(()=> {
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
    document.body.appendChild(s);
    return ()=> { document.body.removeChild(s); };
  }, []);

  async function onSubmit(e:any) {
    e.preventDefault(); setLoading(true); setError("");
    // @ts-ignore
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha?.ready) { setError("reCAPTCHA読み込み中。少し待って再試行してください。"); setLoading(false); return; }
    // @ts-ignore
    const token = await grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: "submit" });
    const res = await fetch("/api/posts", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        type, title, content,
        tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
        deleteKey, recaptchaToken: token
      })
    });
    const json = await res.json();
    if (!json.ok) { setError("投稿に失敗しました。"); setLoading(false); return; }
    router.push(`/posts/${json.id}`);
  }

  return (
    <Suspense fallback={
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-2 text-xl font-bold">投稿する</h2>
      <p className="mb-4 text-sm text-gray-600">ニックネーム不要、<b>3行からOK</b>。荒らし対策で<strong>削除用パスワード</strong>が必須です。</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          種別
          <select value={type} onChange={(e)=>setType(e.target.value)} className="mt-1 w-full rounded-md border p-2">
            {TYPES.map(([val,label])=> <option key={val} value={val}>{label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          タイトル
          <input value={title} onChange={(e)=>setTitle(e.target.value)} required
            placeholder="例：雨の日でも楽しい『〇〇パス』を作ろう"
            className="mt-1 w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
        </label>

        <label className="block text-sm">
          本文
          <textarea value={content} onChange={(e)=>setContent(e.target.value)} rows={8}
            placeholder="背景・困りごと・やりたいこと・協力してほしいこと など"
            className="mt-1 w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
        </label>

        <label className="block text-sm">
          タグ（カンマ区切り）
          <input value={tags} onChange={(e)=>setTags(e.target.value)} placeholder="子育て, 観光, 移住"
            className="mt-1 w-full rounded-md border p-2"/>
        </label>

        <label className="block text-sm">
          削除用パスワード（必須）
          <input value={deleteKey} onChange={(e)=>setDeleteKey(e.target.value)} required placeholder="自分だけが知る合言葉"
            className="mt-1 w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-red-400"/>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" disabled={loading}>
          {loading ? "送信中…" : "投稿する"}
        </button>
      </form>
    </div>}>
    </Suspense>
  );
}
