"use client";
import { useState } from "react";

export default function ReportButton({ postId }:{ postId:string }) {
  const [open,setOpen] = useState(false);
  const [reason,setReason] = useState("");
  const [msg,setMsg] = useState("");

  async function submit() {
    if (!reason.trim()) return;
    const r = await fetch("/api/report", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ postId, reason })});
    const j = await r.json();
    setMsg(j.duplicate ? "同じ内容の通報は受付済みです。" : "通報を受け付けました。ありがとうございます。");
    setOpen(false); setReason("");
  }

  return (
    <div className="mt-6">
      <button onClick={()=>setOpen(true)} className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">🚩 通報する</button>
      {msg && <p className="mt-2 text-xs text-gray-600">{msg}</p>}
      {open && (
        <div className="mt-2 rounded-lg border bg-white p-3">
          <p className="text-sm">通報理由（例：スパム、誹謗中傷、個人情報など）</p>
          <textarea className="mt-2 w-full rounded border p-2" rows={3} value={reason} onChange={e=>setReason(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button onClick={submit} className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 text-sm">送信</button>
            <button onClick={()=>setOpen(false)} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
}
