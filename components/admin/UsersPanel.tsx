// components/admin/UsersPanel.tsx
"use client";
import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  posts: number;
  comments: number;
  lockedUntil?: string | null;
  lockedReason?: string | null;
  lastActive: string | null;
};

const FAR_FUTURE_ISO = "2099-12-31T00:00:00.000Z"; // 恒久ロック用

function toState(lockedUntil?: string | null) {
  if (!lockedUntil) return { label: "ACTIVE", cls: "bg-green-100 text-green-700" };
  const until = new Date(lockedUntil);
  return until > new Date()
    ? { label: "LOCKED（期限）", cls: "bg-orange-100 text-orange-700" }
    : { label: "ACTIVE", cls: "bg-green-100 text-green-700" };
}

export default function UsersPanel(){
  const [rows,setRows] = useState<UserRow[]>([]);
  const [q,setQ] = useState("");
  const [reason,setReason] = useState("");

  async function load(){
    const r = await fetch(`/api/admin/users${q?`?q=${encodeURIComponent(q)}`:""}`, { cache:"no-store" });
    const j = await r.json(); setRows(j.users || []);
  }
  useEffect(()=>{ load(); }, [q]);

  const lockFor = async (id:string, days:number)=>{
    await fetch(`/api/admin/users/${id}`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ days, reason: reason.trim() || undefined }),
    });
    await load();
  };
  const lockForever = async (id:string)=>{
    await fetch(`/api/admin/users/${id}`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ until: FAR_FUTURE_ISO, reason: reason.trim() || undefined }),
    });
    await load();
  };
  const unlock = async (id:string)=>{
    await fetch(`/api/admin/users/${id}`, {
      method:"PATCH", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ unlock: true }),
    });
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="ユーザID検索" className="rounded border px-3 py-1.5 text-sm"/>
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="ロック理由（任意）" className="flex-1 rounded border px-3 py-1.5 text-sm"/>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500">
            <th>ID</th><th>投稿</th><th>コメ</th><th>状態</th><th>期限/理由</th><th>操作</th>
          </tr></thead>
          <tbody>
            {rows.map(r=>{
              const st = toState(r.lockedUntil);
              const untilText = r.lockedUntil ? new Date(r.lockedUntil).toLocaleString() : "-";
              return (
                <tr key={r.id} className="border-t">
                  <td><code className="text-[11px]">{r.id}</code></td>
                  <td>{r.posts}</td>
                  <td>{r.comments}</td>
                  <td><span className={`rounded px-2 py-0.5 ${st.cls}`}>{st.label}</span></td>
                  <td className="text-xs">
                    {st.label.startsWith("LOCKED") ? `~ ${untilText}` : "-"}
                    {r.lockedReason ? <div className="text-[11px] text-gray-500">理由: {r.lockedReason}</div> : null}
                  </td>
                  <td className="space-x-1">
                    <button onClick={()=>lockFor(r.id, 1)}  className="rounded border px-2 py-1">1日</button>
                    <button onClick={()=>lockFor(r.id, 7)}  className="rounded border px-2 py-1">7日</button>
                    <button onClick={()=>lockFor(r.id, 30)} className="rounded border px-2 py-1">30日</button>
                    <button onClick={()=>lockForever(r.id)} className="rounded bg-red-600 px-2 py-1 text-white">恒久</button>
                    <button onClick={()=>unlock(r.id)} className="rounded border px-2 py-1">解除</button>
                  </td>
                </tr>
              );
            })}
            {rows.length===0 && <tr><td colSpan={6} className="py-6 text-center text-gray-500">該当なし</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}