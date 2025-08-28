"use client";
import { useEffect, useMemo, useState } from "react";

type Report = {
  id:string; reason:string; createdAt:string;
  post: { id:string; title:string; type:string; status:string; likeCount:number; recCount:number; cmtCount:number; createdAt:string };
};

export default function ReportsPanel() {
  const [reports,setReports] = useState<Report[]>([]);
  const [sel,setSel] = useState<Record<string,boolean>>({});
  const selected = useMemo(()=> Object.entries(sel).filter(([,v])=>v).map(([k])=>k), [sel]);
  const [note,setNote] = useState("");

  async function load() {
    const r = await fetch("/api/admin/reports");
    const j = await r.json(); setReports(j.reports || []);
  }
  useEffect(()=>{ load(); }, []);

  async function act(action:"DISMISS"|"REMOVE_POST"|"RESTORE_POST"|"MARK_RESOLVED") {
    if (!selected.length) return;
    await fetch("/api/admin/reports/resolve", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action, reportIds: selected, note })
    });
    await load(); setSel({}); setNote("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={()=>act("REMOVE_POST")} className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">対象投稿を削除</button>
        <button onClick={()=>act("RESTORE_POST")} className="rounded border px-3 py-1.5 hover:bg-gray-50">対象投稿を公開</button>
        <button onClick={()=>act("MARK_RESOLVED")} className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">対応済みにする</button>
        <button onClick={()=>act("DISMISS")} className="rounded border px-3 py-1.5 hover:bg-gray-50">棄却</button>
        <span className="ml-auto text-sm text-gray-500">選択: {selected.length}件</span>
      </div>

      <label className="block text-sm">
        管理メモ（任意）
        <input value={note} onChange={e=>setNote(e.target.value)} className="mt-1 w-full rounded border p-2" placeholder="対応理由・判断根拠など"/>
      </label>

      <div className="rounded-xl border bg-white p-3">
        <table className="w-full table-fixed border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="w-10 px-2">選</th>
              <th className="w-40 px-2">投稿</th>
              <th className="px-2">理由</th>
              <th className="w-40 px-2">投稿指標</th>
              <th className="w-40 px-2">日時</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r=>(
              <tr key={r.id} className="rounded-lg bg-gray-50 align-top">
                <td className="px-2"><input type="checkbox" checked={!!sel[r.id]} onChange={e=>setSel(s=>({ ...s, [r.id]: e.target.checked }))}/></td>
                <td className="px-2">
                  <div className="text-xs"><span className="rounded bg-gray-200 px-2 py-0.5">{r.post.type}</span> <span className={`ml-1 rounded px-2 py-0.5 text-xs ${r.post.status==="REMOVED"?"bg-red-100":"bg-blue-100"}`}>{r.post.status}</span></div>
                  <div className="font-medium line-clamp-2">{r.post.title}</div>
                  <a className="text-xs text-blue-600 hover:underline" href={`/posts/${r.post.id}`} target="_blank">投稿を開く</a>
                </td>
                <td className="px-2 text-sm">{r.reason}</td>
                <td className="px-2 text-xs text-gray-700">👍{r.post.likeCount} / ⭐{r.post.recCount} / 💬{r.post.cmtCount}</td>
                <td className="px-2 text-xs text-gray-500">
                  <div>報告: {new Date(r.createdAt).toLocaleString()}</div>
                  <div>投稿: {new Date(r.post.createdAt).toLocaleDateString()}</div>
                </td>
              </tr>
            ))}
            {reports.length===0 && (
              <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-500">OPENの通報はありません。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
