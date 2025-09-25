// components/admin/ReportsPanel.tsx（抜粋差し替え）
"use client";
import { useEffect, useMemo, useState } from "react";
import { TimeText } from "./TimeText";

type Report = {
  id: string;
  reason: string;
  note?: string;
  createdAt: string;
  status: "OPEN" | "CHECKED" | "REJECTED";
  // 追加: 通報者（report作成者）と投稿者のIDをAPIから返す
  reporterId?: string | null;
  authorId?: string | null;
  post: {
    id: string; title: string; type: string; status: string;
    likeCount: number; recCount: number; cmtCount: number; createdAt: string;
  };
};

function isCommentReason(r: string){ return /comment/i.test(r); }
const statusLabel = { OPEN:"受付中", CHECKED:"対応済", REJECTED:"棄却" } as const;
const statusClass = { OPEN:"bg-gray-100 text-gray-700", CHECKED:"bg-green-100 text-green-700", REJECTED:"bg-red-100 text-red-700" } as const;

export default function ReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const selected = useMemo(()=>Object.entries(sel).filter(([,v])=>v).map(([k])=>k),[sel]);
  const [note, setNote] = useState("");

  // ▼ 追加: 状態フィルタ
  const [statusFilter, setStatusFilter] = useState<"ALL"|"OPEN"|"CHECKED"|"REJECTED">("ALL");

  async function load() {
    const qs = statusFilter==="ALL" ? "" : `?status=${statusFilter}`;
    const r = await fetch(`/api/admin/reports${qs}`, { cache:"no-store" });
    const j = await r.json();
    setReports(j.reports || []);
  }
  useEffect(()=>{ load(); }, [statusFilter]);

  async function act(action:"DISMISS"|"REMOVE_POST"|"RESTORE_POST"|"MARK_RESOLVED") {
    if (!selected.length) return;
    const payload:any = { action, reportIds: selected };
    const trimmed = note.trim();
    if ((action==="MARK_RESOLVED"||action==="DISMISS") && trimmed) payload.note = trimmed;
    await fetch("/api/admin/reports/resolve", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(payload) });
    await load(); setSel({}); setNote("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={()=>act("REMOVE_POST")} className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">対象投稿を削除</button>
        <button onClick={()=>act("RESTORE_POST")} className="rounded border px-3 py-1.5 hover:bg-gray-50">対象投稿を公開</button>
        <button onClick={()=>act("MARK_RESOLVED")} className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">対応済みにする</button>
        <button onClick={()=>act("DISMISS")} className="rounded border px-3 py-1.5 hover:bg-gray-50">棄却</button>

        {/* ▼ 追加: 状態フィルタ */}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-600">状態</label>
          <select
            value={statusFilter}
            onChange={(e)=>setStatusFilter(e.target.value as any)}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="ALL">すべて</option>
            <option value="OPEN">受付中</option>
            <option value="CHECKED">対応済</option>
            <option value="REJECTED">棄却</option>
          </select>
          <span className="text-sm text-gray-500">選択: {selected.length}件</span>
        </div>
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
              <th className="w-40 px-2">種別/状態</th>
              <th className="w-44 px-2">対象</th>
              <th className="px-2">通報内容 / 理由</th>
              <th className="w-48 px-2">指標/日時/ユーザ</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r=>{
              const isC = isCommentReason(r.reason);
              return (
                <tr key={r.id} className="rounded-lg bg-gray-50 align-top">
                  <td className="px-2">
                    <input type="checkbox" checked={!!sel[r.id]} onChange={e=>setSel(s=>({ ...s, [r.id]: e.target.checked }))}/>
                  </td>

                  <td className="px-2 text-xs space-y-1">
                    <div className={`inline-block rounded px-2 py-0.5 ${isC?"bg-purple-100":"bg-blue-100"}`}>{isC?"コメント":"投稿"}</div>
                    <div><span className={`inline-block rounded px-2 py-0.5 ${statusClass[r.status]}`}>{statusLabel[r.status]}</span></div>
                  </td>

                  <td className="px-2 text-sm">
                    <div className="font-medium line-clamp-2">{r.post.title}</div>
                    <a className="text-xs text-blue-600 hover:underline" href={`/posts/${r.post.id}`} target="_blank">対象を開く</a>
                  </td>

                  <td className="px-2 text-sm">
                    {r.note ? (
                      <blockquote className="rounded border bg-white p-2 text-xs text-gray-800 whitespace-pre-wrap">{r.note}</blockquote>
                    ) : <span className="text-xs text-gray-500">（通報本文なし）</span>}
                    <div className="mt-1 text-[11px] text-gray-600">
                      理由: <span className="rounded bg-gray-200 px-2 py-0.5">{r.reason}</span>
                    </div>
                  </td>

                  <td className="px-2 text-xs text-gray-500">
                    <div className="mb-1 text-gray-700">👍{r.post.likeCount} / ⭐{r.post.recCount} / 💬{r.post.cmtCount}</div>
                    <div>通報: <TimeText iso={r.createdAt} /></div>
                    <div>投稿: <TimeText iso={r.post.createdAt} /></div>
                    {/* ▼ 追加: ユーザID（通報者・投稿者） */}
                    <div className="mt-1">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 mr-1">通報者</span>
                      <code className="text-[11px]">{r.reporterId ?? "-"}</code>
                    </div>
                    <div className="mt-0.5">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 mr-1">投稿者</span>
                      <code className="text-[11px]">{r.authorId ?? "-"}</code>
                    </div>
                  </td>
                </tr>
              );
            })}
            {reports.length===0 && <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-500">該当する通報はありません。</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
