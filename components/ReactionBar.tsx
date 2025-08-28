"use client";
import { useState } from "react";

export default function ReactionBar({ postId, likeCount, recCount }:{ postId: string; likeCount:number; recCount:number; }) {
  const [likes, setLikes] = useState(likeCount);
  const [recs, setRecs]   = useState(recCount);
  const [busy, setBusy]   = useState(false);

  async function react(type:"LIKE"|"RECOMMEND") {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/reactions", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ postId, type })});
    if (res.status===409) { setBusy(false); return; }
    if (res.ok) { type==="LIKE" ? setLikes(likes+1) : setRecs(recs+1); }
    setBusy(false);
  }

  return (
    <div className="mt-4 flex gap-3">
      <button onClick={()=>react("LIKE")} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50">👍 いいね {likes}</button>
      <button onClick={()=>react("RECOMMEND")} disabled={busy} className="rounded-lg bg-yellow-400 px-3 py-1.5 text-black hover:bg-yellow-500 disabled:opacity-50">⭐ 推薦 {recs}</button>
    </div>
  );
}
