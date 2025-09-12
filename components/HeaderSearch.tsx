// components/HeaderSearch.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function HeaderSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname() || "/";
  const [q, setQ] = useState(sp.get("q") ?? "");

  // 入力値は URL 変化で同期
  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  // /m/[slug]/... なら自治体配下の一覧へ、それ以外は全体の一覧へ
  const computeListPath = () => {
    const segs = pathname.split("/").filter(Boolean);
    if (segs[0] === "m" && segs[1]) return `/m/${segs[1]}/posts`;
    return "/posts";
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const listPath = computeListPath();
    const next = new URLSearchParams(sp.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    // 検索開始時は1ページ目に戻す
    next.set("page", "1");
    router.push(`${listPath}?${next.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="投稿タイトルで検索"
        className="rounded border px-3 py-1.5 text-sm min-w-[220px]"
        aria-label="投稿検索"
      />
      <button
        type="submit"
        className="rounded bg-blue-600 px-3 py-1.5 text-white text-sm"
      >
        検索
      </button>
    </form>
  );
}
