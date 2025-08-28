"use client";
import { useEffect, useState } from "react";

export default function CommentList({ postId }:{ postId:string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/posts/${postId}/comments`);
    const j = await r.json();
    setComments(j.comments || []);
  }
  useEffect(()=>{ load(); }, [postId]);

  async function submit(e:any) {
    e.preventDefault(); if (!content.trim()) return;
    setBusy(true);
    await fetch("/api/comments", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ postId, content })});
    setContent(""); setBusy(false); load();
  }

  return (
    <section className="mt-6">
      <h4 className="mb-2 text-lg font-semibold">コメント</h4>
      <form onSubmit={submit} className="mb-3 space-y-2">
        <textarea rows={3} value={content} onChange={(e)=>setContent(e.target.value)} placeholder="気づき・応援・補足など"
          className="w-full rounded-md border p-2"></textarea>
        <button className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50" disabled={busy}>送信</button>
      </form>

      <ul className="flex flex-col gap-3">
        {comments.map((c:any)=>(
          <li key={c.id} className="rounded-xl border bg-white p-3">
            <div className="mb-1 text-xs text-gray-500">匿名さん・{new Date(c.createdAt).toLocaleString()}</div>
            <p className="prose-basic text-sm">{c.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
