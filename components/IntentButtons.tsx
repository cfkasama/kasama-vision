// components/IntentButtons.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Counts = { live: number; work: number; tourism: number };
type Kind = "LIVE" | "WORK" | "TOURISM";

const LS_KEY = (slug: string, k: Kind) => `intent_${slug}_${k}`;

export default function IntentButtons({
  mslug,
  mname,
  initial,
}: {
  mslug: string;   // ★ 追加
  mname: string;   // ★ 追加
  initial: Counts;
}) {
  const [counts, setCounts] = useState<Counts>(initial);
  const [busy, setBusy] = useState<Record<Kind, boolean>>({ LIVE:false, WORK:false, TOURISM:false });
  const [pressed, setPressed] = useState<Record<Kind, boolean>>({ LIVE:false, WORK:false, TOURISM:false });

  // トースト
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""), 1800); };

  useEffect(() => {
    try {
      setPressed({
        LIVE: localStorage.getItem(LS_KEY(mslug,"LIVE")) === "1",
        WORK: localStorage.getItem(LS_KEY(mslug,"WORK")) === "1",
        TOURISM: localStorage.getItem(LS_KEY(mslug,"TOURISM")) === "1",
      });
    } catch {}
  }, [mslug]);

  async function press(kind: Kind) {
    if (busy[kind] || pressed[kind]) return;

    setBusy(b => ({ ...b, [kind]: true }));
    // 楽観 +1
    setCounts(c => {
      const n = { ...c };
      if (kind === "LIVE") n.live++;
      if (kind === "WORK") n.work++;
      if (kind === "TOURISM") n.tourism++;
      return n;
    });

    try {
      const r = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ kind, mslug }),
      });
      const j = await r.json().catch(()=> ({}));

      if (r.status === 409) {
        // ロールバックして押済みに
        setCounts(c => {
          const n = { ...c };
          if (kind === "LIVE") n.live = Math.max(n.live - 1, 0);
          if (kind === "WORK") n.work = Math.max(n.work - 1, 0);
          if (kind === "TOURISM") n.tourism = Math.max(n.tourism - 1, 0);
          return n;
        });
        try { localStorage.setItem(LS_KEY(mslug, kind), "1"); } catch {}
        setPressed(p => ({ ...p, [kind]: true }));
        showToast("この意向は既に送信済みです");
        return;
      }

      if (!r.ok || !j?.ok) {
        // 失敗 → ロールバック
        setCounts(c => {
          const n = { ...c };
          if (kind === "LIVE") n.live = Math.max(n.live - 1, 0);
          if (kind === "WORK") n.work = Math.max(n.work - 1, 0);
          if (kind === "TOURISM") n.tourism = Math.max(n.tourism - 1, 0);
          return n;
        });
        showToast("送信に失敗しました");
        return;
      }

      // 成功
      try { localStorage.setItem(LS_KEY(mslug, kind), "1"); } catch {}
      setPressed(p => ({ ...p, [kind]: true }));
      showToast("ありがとうございます！");
    } catch {
      setCounts(c => {
        const n = { ...c };
        if (kind === "LIVE") n.live = Math.max(n.live - 1, 0);
        if (kind === "WORK") n.work = Math.max(n.work - 1, 0);
        if (kind === "TOURISM") n.tourism = Math.max(n.tourism - 1, 0);
        return n;
      });
      showToast("通信エラーが発生しました");
    } finally {
      setBusy(b => ({ ...b, [kind]: false }));
    }
  }
  
  const btn =
    "w-full rounded-2xl px-4 py-5 text-white text-lg font-semibold shadow transition disabled:opacity-60";
  const box = "rounded-xl border bg-white p-4 flex flex-col gap-3";
  
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {/* LIVE */}
        <div className={box}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">押された数 {counts.live}</span>
          </div>
          <button
            onClick={() => press("LIVE")}
            disabled={busy.LIVE || pressed.LIVE}
            className={`${btn} bg-emerald-600 hover:bg-emerald-700`}
          >
            {busy.LIVE ? "⏳ 送信中…" : `🏠 ${mname}に住みたい`}
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

        {/* WORK */}
        <div className={box}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">押された数 {counts.work}</span>
          </div>
          <button
            onClick={() => press("WORK")}
            disabled={busy.WORK || pressed.WORK}
            className={`${btn} bg-blue-600 hover:bg-blue-700`}
          >
            {busy.WORK ? "⏳ 送信中…" : `💼 ${mname}で働きたい`}
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

        {/* TOURISM */}
        <div className={box}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">押された数 {counts.tourism}</span>
          </div>
          <button
            onClick={() => press("TOURISM")}
            disabled={busy.TOURISM || pressed.TOURISM}
            className={`${btn} bg-orange-600 hover:bg-orange-700`}
          >
            {busy.TOURISM ? "⏳ 送信中…" : `🚆 ${mname}に行きたい`}
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

      {/* トースト */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/80 px-3 py-2 text-xs text-white"
        >
          {toast}
        </div>
      )}
    </>
  );
}
