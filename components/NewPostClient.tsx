"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Municipality = { id: string; name: string; slug: string };

const TYPES: [string, string][] = [
  ["CONSULTATION", "相談"],
  ["PROPOSAL", "提案"],
  ["CATCHPHRASE", "キャッチフレーズ"],
  ["VISION", "ビジョン"],
  ["REPORT_LIVE", "住めなかった報告"],
  ["REPORT_WORK", "働けなかった報告"],
  ["REPORT_TOURISM", "不満がある報告"],
];

export default function NewPostClient({
  initialType,
  municipalities,
  initialMunicipalitySlug = "japan", // ← 追加（既定値）
}: {
  initialType?: string;
  municipalities: Municipality[];
  initialMunicipalitySlug?: string;
}) {
  const router = useRouter();

  const [type, setType] = useState<string>(initialType || "CONSULTATION");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [deleteKey, setDeleteKey] = useState("");

  // ここを "japan" 優先に
  const [municipalitySlug, setMunicipalitySlug] = useState<string>(() => {
    const exists = municipalities.some(m => m.slug === initialMunicipalitySlug);
    if (exists) return initialMunicipalitySlug;
    return municipalities[0]?.slug ?? "";
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js`;
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // @ts-ignore
    const grecaptcha = (window as any)?.grecaptcha;
    if (!grecaptcha?.execute) {
      setError("reCAPTCHA読み込み中。少し待って再試行してください。");
      setLoading(false);
      return;
    }
    if (!municipalitySlug) {
      setError("自治体を選択してください。");
      setLoading(false);
      return;
    }

    try {
      const token = await grecaptcha.execute(
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
        { action: "submit" }
      );

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          content,
          tags: tags.split(",").map(s => s.trim()).filter(Boolean),
          deleteKey,
          recaptchaToken: token,
          municipalitySlug, // ← 日本/本サイト含む slug を送る
        }),
      });

      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "投稿に失敗しました。");
      router.push(`/posts/${json.id}`);
    } catch (err: any) {
      setError(err?.message || "投稿に失敗しました。");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-2 text-xl font-bold">投稿する</h2>
      <p className="mb-4 text-sm text-gray-600">
        ニックネーム不要。荒らし対策で
        <strong>削除用パスワード</strong>が必須です。
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* 自治体セレクト（日本がデフォルト） */}
        <label className="block text-sm">
          自治体（必須）
          <select
            value={municipalitySlug}
            onChange={(e) => setMunicipalitySlug(e.target.value)}
            required
            className="mt-1 w-full rounded-md border p-2"
          >
            <option value="" disabled>選択してください</option>
            {municipalities.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        {/* 種別 */}
        <label className="block text-sm">
          種別
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-md border p-2"
          >
            {TYPES.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {/* タイトル */}
        <label className="block text-sm">
          タイトル
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="例：雨の日でも楽しい『〇〇パス』を作ろう"
            className="mt-1 w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        {/* 本文 */}
        <label className="block text-sm">
          本文
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="背景・困りごと・やりたいこと・協力してほしいこと など"
            className="mt-1 w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        {/* タグ */}
        <label className="block text-sm">
          タグ（カンマ区切り）
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="子育て, 観光, 移住"
            className="mt-1 w-full rounded-md border p-2"
          />
        </label>

        {/* 削除用パスワード */}
        <label className="block text-sm">
          削除用パスワード（必須）
          <input
            value={deleteKey}
            onChange={(e) => setDeleteKey(e.target.value)}
            required
            placeholder="自分だけが知る合言葉"
            className="mt-1 w-full rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </label>

        {/* エラー/送信 */}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="g-recaptcha inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
          data-callback="onSubmit"
          data-size="invisible"
          disabled={loading}
        >
          {loading ? "送信中…" : "投稿する"}
        </button>
      </form>
    </div>
  );
}
