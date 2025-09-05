"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Counts = { live: number; work: number; tourism: number };

const LS_KEY = (k: "LIVE" | "WORK" | "TOURISM") => `intent_${k.toLowerCase()}`;

export default function IntentButtons({ initial }: { initial: Counts }) {
  const [counts, setCounts] = useState<Counts>(initial);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [pressed, setPressed] = useState<{ LIVE: boolean; WORK: boolean; TOURISM: boolean }>({
    LIVE: false,
    WORK: false,
    TOURISM: false,
  });

  // CSR で押済み状態を復元
  useEffect(() => {
    try {
      setPressed({
        LIVE: localStorage.getItem(LS_KEY("LIVE")) === "1",
        WORK: localStorage.getItem(LS_KEY("WORK")) === "1",
        TOURISM: localStorage.getItem(LS_KEY("TOURISM")) === "1",
      });
    } catch {/* noop */}
  }, []);

  async function press(kind: "LIVE" | "WORK" | "TOURISM") {
    if (busy[kind]) return;
    if (pressed[kind]) return;

    setBusy((b) => ({ ...b, [kind]: true }));

    // 楽観的 +1
    setCounts((c) => {
      const next = { ...c };
      if (kind === "LIVE") next.live += 1;
      if (kind === "WORK") next.work += 1;
      if (kind === "TOURISM") next.tourism += 1;
      return next;
    });

    try {
      const r = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const j = await r.json().catch(() => ({}));

      if (r.status === 409) {
        // 既に押済み → 表示を元に戻しつつ、この端末でも押済みにする
        setCounts((c) => {
          const next = { ...c };
          if (kind === "LIVE") next.live = Math.max(next.live - 1, 0);
          if (kind === "WORK") next.work = Math.max(next.work - 1, 0);
          if (kind === "TOURISM") next.tourism = Math.max(next.tourism - 1, 0);
          return next;
        });
        try { localStorage.setItem(LS_KEY(kind), "1"); } catch {}
        setPressed((p) => ({ ...p, [kind]: true }));
        alert("この意向は既に送信済みです。");
        return;
      }

      if (!r.ok || !j?.ok) {
        // 失敗 → ロールバック
        setCounts((c) => {
          const next = { ...c };
          if (kind === "LIVE") next.live = Math.max(next.live - 1, 0);
          if (kind === "WORK") next.work = Math.max(next.work - 1, 0);
          if (kind === "TOURISM") next.tourism = Math.max(next.tourism - 1, 0);
          return next;
        });
        alert("送信に失敗しました。しばらくしてから再度お試しください。");
        return;
      }

      // 成功 → 端末に押済み保存
      try { localStorage.setItem(LS_KEY(kind), "1"); } catch {}
      setPressed((p) => ({ ...p, [kind]: true }));
    } catch {
      // エラー → ロールバック
      setCounts((c) => {
        const next = { ...c };
        if (kind === "LIVE") next.live = Math.max(next.live - 1, 0);
        if (kind === "WORK") next.work = Math.max(next.work - 1, 0);
        if (kind === "TOURISM") next.tourism = Math.max(next.tourism - 1, 0);
        return next;
      });
      alert("送信エラーが発生しました。");
    } finally {
      setBusy((b) => ({ ...b, [kind]: false }));
    }
  }

  const btn =
    "w-full rounded-2xl px-4 py-5 text-white text-lg font-semibold shadow transition disabled:opacity-60";
  const box = "rounded-xl border bg-white p-4 flex flex-col gap-3";

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className={box}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">押された数 {counts.live}</span>
        </div>
        <button
          onClick={() => press("LIVE")}
          disabled={!!busy.LIVE || pressed.LIVE}
          className={`${btn} bg-emerald-600 hover:bg-emerald-700`}
        >
          🏠 笠間に住みたい
        </button>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/new?type=REPORT_LIVE" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
            住めなかった報告を投稿
          </Link>
          <Link href="/posts?type=REPORT_LIVE" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
            報告一覧へ
          </Link>
        </div>
      </div>

      <div className={box}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">押された数 {counts.work}</span>
        </div>
        <button
          onClick={() => press("WORK")}
          disabled={!!busy.WORK || pressed.WORK}
          className={`${btn} bg-blue-600 hover:bg-blue-700`}
        >
          💼 笠間で働きたい
        </button>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/new?type=REPORT_WORK" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
            働けなかった報告を投稿
          </Link>
          <Link href="/posts?type=REPORT_WORK" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
            報告一覧へ
          </Link>
        </div>
      </div>

      <div className={box}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">押された数 {counts.tourism}</span>
        </div>
        <button
          onClick={() => press("TOURISM")}
          disabled={!!busy.TOURISM || pressed.TOURISM}
          className={`${btn} bg-orange-600 hover:bg-orange-700`}
        >
          🚆 笠間に行きたい
        </button>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/new?type=REPORT_TOURISM" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
            不満がある報告を投稿
          </Link>
          <Link href="/posts?type=REPORT_TOURISM" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
            報告一覧へ
          </Link>
        </div>
      </div>
    </section>
  );
}