// components/HeaderSearch.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";

export default function HeaderSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname() || "/";

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const isMobile = useMemo(
    () => (typeof window !== "undefined") && window.matchMedia("(max-width: 767px)").matches,
    []
  );

  const computeListPath = useCallback(() => {
    const segs = pathname.split("/").filter(Boolean);
    if (segs[0] === "m" && segs[1]) return `/m/${segs[1]}/posts`;
    return "/posts";
  }, [pathname]);

  const doSearch = useCallback(() => {
    const listPath = computeListPath();
    const next = new URLSearchParams(sp.toString());
    if (q.trim()) next.set("q", q.trim()); else next.delete("q");
    next.set("page", "1");
    router.push(`${listPath}?${next.toString()}`);
  }, [computeListPath, q, router, sp]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch();
    setOpen(false);
  };

  // --- UI ---
  return (
    <>
      {/* モバイル：検索アイコンのみ（モーダルを開く） */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center rounded border px-2 py-1.5 text-sm"
        aria-label="検索を開く"
      >
        🔍
      </button>

      {/* デスクトップ：コンパクト検索（幅を固定＆縮み許可） */}
      <form onSubmit={onSubmit} className="hidden md:flex items-center gap-2 shrink-0">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="投稿タイトルで検索"
          aria-label="投稿検索"
          className="min-w-0 w-[240px] lg:w-[320px] max-w-full rounded border px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-3 py-1.5 text-white text-sm"
        >
          検索
        </button>
      </form>

      {/* 全画面モーダル（モバイル専用） */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-white"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto max-w-screen-sm p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">検索</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded px-3 py-1.5 text-sm border hover:bg-gray-50"
              >
                閉じる
              </button>
            </div>

            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="投稿タイトルで検索"
                className="flex-1 rounded border px-3 py-2 text-base"
                aria-label="投稿検索（モーダル）"
              />
              <button
                type="submit"
                className="shrink-0 rounded bg-blue-600 px-4 py-2 text-white"
              >
                検索
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}