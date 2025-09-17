// components/HeaderSearch.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";

export default function HeaderSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname() || "/";

  // ===== state =====
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);

  // URL→入力値を同期（戻る/進む対応）
  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  // 背景スクロールを止める
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // スマホ判定
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  }, []);

  // /m/[slug]/... なら自治体配下の一覧へ、それ以外は全体へ
  const computeListPath = useCallback(() => {
    const segs = pathname.split("/").filter(Boolean);
    if (segs[0] === "m" && segs[1]) return `/m/${segs[1]}/posts`;
    return "/posts";
  }, [pathname]);

  const doSearch = useCallback(() => {
    const listPath = computeListPath();
    const next = new URLSearchParams(sp.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    next.set("page", "1"); // 1ページ目に戻す
    router.push(`${listPath}?${next.toString()}`);
  }, [computeListPath, q, router, sp]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch();
    setOpen(false);
  };

  // フォーカスでモーダルを開く（スマホのみ）
  const onFocusHeaderInput = () => {
    if (isMobile) setOpen(true);
  };

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ===== UI =====
  return (
    <>
      {/* ヘッダー内の小さめ検索（スマホはフォーカスでモーダルへ） */}
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={onFocusHeaderInput}
          placeholder="投稿タイトルで検索"
          className="rounded border px-3 py-1.5 text-sm min-w-[220px]"
          aria-label="投稿検索"
        />
        <button
          type="submit"
          className="hidden md:inline-flex rounded bg-blue-600 px-3 py-1.5 text-white text-sm"
        >
          検索
        </button>
      </form>

      {/* フルスクリーン検索モーダル（モバイル優先） */}
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

            {/* 予測や最近の検索を入れるならここに */}
            {/* <div className="mt-4 text-sm text-gray-500">キーワード例：移住、保育、観光</div> */}
          </div>
        </div>
      )}
    </>
  );
}