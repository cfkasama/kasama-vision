"use client";
import { useState } from "react";

export default function ReactionBar({ postId, likeCount }:{ postId: string; likeCount:number;}) {
  const [likes, setLikes] = useState(likeCount);
  const [busy, setBusy]   = useState(false);

  async function react(type:"LIKE"|"RECOMMEND") {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/reactions", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ postId, type })});
    if (res.status===409) { setBusy(false); return; }
    if (res.ok) { setLikes(likes+1); }
    setBusy(false);
  }

  return (
    <div className="mt-4 flex gap-3">
      <button onClick={()=>react("LIKE")} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50">👍 いいね {likes}</button>
    </div>
  );
}
