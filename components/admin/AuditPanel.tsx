"use client";
import { useEffect, useState } from "react";

type Row = { id:string; actor:string; action:string; targetType:string; targetId?:string; meta?:any; ip?:string; ua?:string; createdAt:string };

export default function AuditPanel() {
  const [rows,setRows] = useState<Row[]>([]);
  const [page,setPage] = useState(1);
  const [actor,setActor] = useState("");
  const [action,setAction] = useState("");
  const [q,setQ] = useState("");
  const [pages,setPages] = useState(1);

  async function load(p=1) {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (actor) params.set("actor", actor);
    if (action) params.set("action", action);
    if (q) params.set("q", q);
    const r = await fetch(`/api/admin/audit?${params.toString()}`);
    const j = await r.json();
    setRows(j.rows || []); setPages(j.pages || 1); setPage(j.page || 1);
  }
  useEffect(()=>{ load(1); }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">Actor
          <input value={actor} onChange={e=>setActor(e.target.value)} className="ml-1 rounded border p-1.5" placeholder="github-login"/>
        </label>
        <label className="text-sm">Action
          <input value={action} onChange={e=>setAction(e.target.value)} className="ml-1 rounded border p-1.5" placeholder="REMOVE_POST"/>
        </label>
        <label className="text-sm">Search
          <input value={q} onChange={e=>setQ(e.target.value)} className="ml-1 rounded border p-1.5" placeholder="postIdなど"/>
        </label>
        <button onClick={()=>load(1)} className="rounded border px-3 py-1.5 hover:bg-gray-50">検索</button>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <table className="w-full table-fixed border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="w-40 px-2">日時</th>
              <th className="w-24 px-2">Actor</th>
              <th className="w-32 px-2">Action</th>
              <th className="w-24 px-2">Type</th>
              <th className="px-2">Target</th>
              <th className="px-2">Meta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="bg-gray-50 align-top">
                <td className="px-2 text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-2 text-xs">{r.actor}</td>
                <td className="px-2 text-xs">{r.action}</td>
                <td className="px-2 text-xs">{r.targetType}</td>
                <td className="px-2 text-xs break-words">{r.targetId || "-"}</td>
                <td className="px-2 text-xs text-gray-700">{r.meta ? JSON.stringify(r.meta) : "-"}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={6} className="py-6 text-center text-sm text-gray-500">該当ログがありません。</td></tr>}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">Page {page} / {pages}</span>
          <div className="flex gap-2">
            <button onClick={()=>load(Math.max(1, page-1))} className="rounded border px-2 py-1 text-sm hover:bg-gray-50" disabled={page<=1}>←</button>
            <button onClick={()=>load(Math.min(pages, page+1))} className="rounded border px-2 py-1 text-sm hover:bg-gray-50" disabled={page>=pages}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
