"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

type Counts = { live: number; work: number; tourism: number };

const LS_KEY = (k: "LIVE" | "WORK" | "TOURISM") => `intent_${k.toLowerCase()}`;

export default function IntentButtons({ initial }: { initial: Counts }) {
  const [counts, setCounts] = useState<Counts>(initial);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // 1端末で複数回の“連打”を抑止（1回押したらローカル保存）
  const pressed = useMemo(
    () => ({
      LIVE: localStorage.getItem(LS_KEY("LIVE")) === "1",
      WORK: localStorage.getItem(LS_KEY("WORK")) === "1",
      TOURISM: localStorage.getItem(LS_KEY("TOURISM")) === "1",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeof window !== "undefined" && localStorage.getItem(LS_KEY("LIVE")), typeof window !== "undefined" && localStorage.getItem(LS_KEY("WORK")), typeof window !== "undefined" && localStorage.getItem(LS_KEY("TOURISM"))]
  );

  async function press(kind: "LIVE" | "WORK" | "TOURISM") {
    if (busy[kind]) return;
    if (pressed[kind]) return; // 端末内で一度だけ

    setBusy((b) => ({ ...b, [kind]: true }));
    // 楽観的更新
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
      if (!r.ok || !j?.ok) {
        // ロールバック
        setCounts((c) => {
          const next = { ...c };
          if (kind === "LIVE") next.live = Math.max(next.live - 1, 0);
          if (kind === "WORK") next.work = Math.max(next.work - 1, 0);
          if (kind === "TOURISM") next.tourism = Math.max(next.tourism - 1, 0);
          return next;
        });
        alert("送信に失敗しました。通信状況をご確認ください。");
      } else {
        localStorage.setItem(LS_KEY(kind), "1");
      }
    } catch {
      // ロールバック
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

  const btnBase =
    "w-full rounded-2xl px-4 py-5 text-white text-lg font-semibold shadow transition disabled:opacity-60";
  const box =
    "rounded-xl border bg-white p-4 flex flex-col gap-3";

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {/* 笠間に住みたい */}
      <div className={box}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">押された数 {counts.live}</span>
        </div>
        <button
          onClick={() => press("LIVE")}
          disabled={!!busy.LIVE || pressed.LIVE}
          className={`${btnBase} bg-emerald-600 hover:bg-emerald-700`}
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

      {/* 笠間で働きたい */}
      <div className={box}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">押された数 {counts.work}</span>
        </div>
        <button
          onClick={() => press("WORK")}
          disabled={!!busy.WORK || pressed.WORK}
          className={`${btnBase} bg-blue-600 hover:bg-blue-700`}
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

      {/* 笠間に行きたい */}
      <div className={box}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">押された数 {counts.tourism}</span>
        </div>
        <button
          onClick={() => press("TOURISM")}
          disabled={!!busy.TOURISM || pressed.TOURISM}
          className={`${btnBase} bg-orange-600 hover:bg-orange-700`}
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