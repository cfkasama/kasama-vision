// components/admin/TimeText.tsx
"use client";
import { useEffect, useState } from "react";

export function TimeText({ iso, withDateOnly = false }: { iso: string; withDateOnly?: boolean }) {
  // SSR時はISOそのまま（サーバと一致させる）
  const [txt, setTxt] = useState(iso);

  useEffect(() => {
    const d = new Date(iso);
    const fmt = withDateOnly
      ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" })
      : new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" });
    setTxt(fmt.format(d));
  }, [iso, withDateOnly]);

  return <span suppressHydrationWarning>{txt}</span>;
}