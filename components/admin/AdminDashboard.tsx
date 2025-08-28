"use client";
import { useMemo, useState } from "react";
import ReportsPanel from "./ReportsPanel";
import AuditPanel from "./AuditPanel";
import { signOut } from "next-auth/react";

export default function AdminDashboard({ me, initialPosts }:{ me:any; initialPosts:any[] }) {
  const [posts,setPosts] = useState<any[]>(initialPosts);
  const [sel,setSel] = useState<Record<string,boolean>>({});
  const selectedIds = useMemo(()=> Object.entries(sel).filter(([,v])=>v).map(([k])=>k), [sel]);
  const [tab,setTab] = useState<"posts"|"reports"|"audit">("posts");

  async function act(action:"REMOVE"|"REALIZE"|"RESTORE") {
    if (selectedIds.length===0) return;
    await fetch("/api/admin/moderate",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action, postIds: selectedIds })});
    setPosts(ps => ps.map(p => selectedIds.includes(p.id) ? { ...p, status: action==="REMOVE"?"REMOVED": action==="REALIZE"?"REALIZED":"PUBLISHED", realizedAt: action==="REALIZE" ? new Date().toISOString() : p.realizedAt } : p));
    setSel({});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">管理ダッシュボード</h1>
        <div className="text-sm text-gray-600">ようこそ、{me.login} さん <button onClick={()=>signOut()} className="ml-3 rounded border px-2 py-1 hover:bg-gray-50">ログアウト</button></div>
      </div>

      <div className="flex gap-2">
        <button onClick={()=>setTab("posts")} className={`rounded border px-3 py-1.5 ${tab==="posts"?"bg-white":""}`}>投稿レビュー</button>
        <button onClick={()=>setTab("reports")} className={`rounded border px-3 py-1.5 ${tab==="reports"?"bg-white":""}`}>通報</button>
        <button onClick={()=>setTab("audit")} className={`rounded border px-3 py-1.5 ${tab==="audit"?"bg-white":""}`}>監査ログ</button>
      </div>

      {tab==="posts" ? (
        <div className="rounded-xl border bg-white p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <button onClick={()=>act("REMOVE")} className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">強制削除</button>
            <button onClick={()=>act("REALIZE")} className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">実現にする</button>
            <button onClick={()=>act("RESTORE")} className="rounded border px-3 py-1.5 hover:bg-gray-50">復元</button>
            <span className="ml-auto text-sm text-gray-500">選択: {selectedIds.length}件</span>
          </div>

          <table className="w-full table-fixed border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="w-10 px-2">選</th>
                <th className="w-24 px-2">種別</th>
                <th className="px-2">タイトル</th>
                <th className="w-24 px-2">状態</th>
                <th className="w-36 px-2">指標</th>
                <th className="w-36 px-2">日時</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p=>(
                <tr key={p.id} className="rounded-lg bg-gray-50">
                  <td className="px-2 align-top"><input type="checkbox" checked={!!sel[p.id]} onChange={(e)=>setSel(s=>({ ...s, [p.id]: e.target.checked }))} /></td>
                  <td className="px-2 align-top text-xs"><span className="rounded bg-gray-200 px-2 py-0.5">{p.type}</span></td>
                  <td className="px-2 align-top">
                    <div className="font-medium">{p.title}</div>
                    <div className="line-clamp-2 text-xs text-gray-600">{p.content}</div>
                  </td>
                  <td className="px-2 align-top text-xs">
                    {p.status==="PUBLISHED" && <span className="rounded bg-blue-100 px-2 py-0.5">公開</span>}
                    {p.status==="REMOVED" && <span className="rounded bg-red-100 px-2 py-0.5">削除</span>}
                    {p.status==="REALIZED" && <span className="rounded bg-green-100 px-2 py-0.5">実現</span>}
                  </td>
                  <td className="px-2 align-top text-xs text-gray-700">👍{p.likeCount} / ⭐{p.recCount} / 💬{p.cmtCount}</td>
                  <td className="px-2 align-top text-xs text-gray-500">
                    <div>{new Date(p.createdAt).toLocaleString()}</div>
                    {p.realizedAt && <div>実現:{new Date(p.realizedAt).toLocaleDateString()}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab==="reports" ? (
        <ReportsPanel />
      ) : (
        <AuditPanel />
      )}
    </div>
  );
}
