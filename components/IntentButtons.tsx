// components/IntentButtons.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Counts = { live: number; work: number; tourism: number };
type Kind = "LIVE" | "WORK" | "TOURISM";

const LS_KEY = (slug: string, k: Kind) => `intent_${slug}_${k}`;

export default function IntentButtons({
  municipalitySlug,
  initial,
}: {
  municipalitySlug: string;   // ★ 追加
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
        LIVE: localStorage.getItem(LS_KEY(municipalitySlug,"LIVE")) === "1",
        WORK: localStorage.getItem(LS_KEY(municipalitySlug,"WORK")) === "1",
        TOURISM: localStorage.getItem(LS_KEY(municipalitySlug,"TOURISM")) === "1",
      });
    } catch {}
  }, [municipalitySlug]);

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
        body: JSON.stringify({ kind, municipalitySlug }),
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
        try { localStorage.setItem(LS_KEY(municipalitySlug, kind), "1"); } catch {}
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
      try { localStorage.setItem(LS_KEY(municipalitySlug, kind), "1"); } catch {}
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

  // …ボタンUIはそのまま。press("LIVE"/"WORK"/"TOURISM") を呼ぶだけ…
}