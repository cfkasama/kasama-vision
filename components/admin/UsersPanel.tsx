"use client";
import { useEffect, useState } from "react";

type UserRow = { id:string; locked:boolean; posts:number; comments:number; lastActive:string|null };

export default function UsersPanel(){
  const [rows,setRows] = useState<UserRow[]>([]);
  const [q,setQ] = useState("");

  async function load(){
    const r = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const j = await r.json(); setRows(j.users || []);
  }
  useEffect(()=>{ load(); }, [q]);

  const toggle = async (id:string, next:boolean)=>{
    await fetch(`/api/admin/users/${id}`, {
      method:"PATCH",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ locked: next }),
    });
    await load();
  };

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={e=>setQ(e.target.value)}
        placeholder="ユーザID検索"
        className="rounded border px-3 py-1.5 text-sm"
      />
      <div className="rounded-xl border bg-white p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th>ID</th><th>投稿</th><th>コメント</th><th>状態</th><th>最終活動</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td><code className="text-xs">{r.id}</code></td>
                <td>{r.posts}</td>
                <td>{r.comments}</td>
                <td>{r.locked
                  ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-700">LOCKED</span>
                  : <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">ACTIVE</span>}
                </td>
                <td>{r.lastActive ? new Date(r.lastActive).toLocaleString() : "-"}</td>
                <td>
                  <button
                    onClick={()=>toggle(r.id, !r.locked)}
                    className={`rounded px-2 py-1 ${r.locked ? "border" : "bg-red-600 text-white"}`}
                  >
                    {r.locked ? "解除" : "ロック"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={6} className="py-6 text-center text-gray-500">該当なし</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
