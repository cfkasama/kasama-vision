"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  ["CONSULTATION","相談"],["PROPOSAL","提案"],
  ["CATCHPHRASE","キャッチフレーズ"],["VISION","ビジョン"],
  ["REPORT_LIVE","住めなかった報告"],["REPORT_WORK","働けなかった報告"],["REPORT_TOURISM","不満がある報告"],
];

type Props = {
  initialType: string;
  initialTitle: string;
  initialTags: string;
};
  
export default function NewPostClient() {
    initialType,
  initialTitle,
  initialTags,
}: Props) {
  const router = useRouter();
  const [type, setType] = useState(initialType || "CONSULTATION");
  const [title, setTitle] = useState(initialTitle || "");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState(initialTags || "");
  const [deleteKey, setDeleteKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    const s = document.createElement("script");
    // v3 は render=siteKey を付ける
    s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    s.async = true;
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, [siteKey]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!siteKey) {
      setError("reCAPTCHAのサイトキーが未設定です。");
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setError("タイトルを入力してください。");
      setLoading(false);
      return;
    }
    if (!deleteKey.trim()) {
      setError("削除用パスワードを入力してください。");
      setLoading(false);
      return;
    }

    try {
      // @ts-ignore
      const grecaptcha = (window as any)?.grecaptcha;
      if (!grecaptcha?.ready) {
        setError("reCAPTCHA読み込み中です。少し待って再試行してください。");
        setLoading(false);
        return;
      }

      await new Promise<void>((resolve) => grecaptcha.ready(resolve));
      // v3 実行
      const token = await grecaptcha.execute(siteKey, { action: "submit" });

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          content,
          tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
          deleteKey,
          recaptchaToken: token,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "投稿に失敗しました。");

      router.push(`/posts/${json.id}`);
      // 遷移するので loading の解除は不要だが、一応
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || "投稿に失敗しました。");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-2 text-xl font-bold">投稿する</h2>
      <p className="mb-4 text-sm text-gray-600">
        ニックネーム不要。荒らし対策で<strong>削除用パスワード</strong>が必須です。
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          種別
          <select value={type} onChange={(e)=>setType(e.target.value)} className="mt-1 w-full rounded-md border p-2">
            {TYPES.map(([val,label])=> <option key={val} value={val}>{label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          タイトル
          <input
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            required
            placeholder="例：雨の日でも楽しい『〇〇パス』を作ろう"
            className="mt-1 w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        <label className="block text-sm">
          本文
          <textarea
            value={content}
            onChange={(e)=>setContent(e.target.value)}
            rows={8}
            placeholder="背景・困りごと・やりたいこと・協力してほしいこと など"
            className="mt-1 w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        <label className="block text-sm">
          タグ（カンマ区切り）
          <input
            value={tags}
            onChange={(e)=>setTags(e.target.value)}
            placeholder="子育て, 観光, 移住"
            className="mt-1 w-full rounded-md border p-2"
          />
        </label>

        <label className="block text-sm">
          削除用パスワード（必須）
          <input
            value={deleteKey}
            onChange={(e)=>setDeleteKey(e.target.value)}
            required
            placeholder="自分だけが知る合言葉"
            className="mt-1 w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* v3では普通のボタンでOK（g-recaptcha属性は削除） */}
        <button
          type="submit"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "送信中…" : "投稿する"}
        </button>
      </form>
    </div>
  );
}
