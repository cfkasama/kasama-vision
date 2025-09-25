// components/admin/CommentsPanel.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;           // ← ここが基準
  identityId: string | null;
  post: { id: string; title: string };
};

export default function CommentsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"ALL" | "PUBLISHED" | "REMOVED">("ALL");
  const [q, setQ] = useState("");
  const [user, setUser] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const limit = 50;
  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    if (status !== "ALL") sp.set("status", status);
    if (q.trim()) sp.set("q", q.trim());
    if (user.trim()) sp.set("user", user.trim());
    sp.set("page", String(page));
    sp.set("limit", String(limit));
    return sp.toString();
  }, [status, q, user, page]);

  async function load() {
    const r = await fetch(`/api/admin/comments?${qs}`, { cache: "no-store" });
    const j = await r.json();
    setRows(j.comments || []);
    setHasNext(!!j.hasNext);
  }
  useEffect(() => { load(); }, [qs]);

  async function updateOne(id: string, action: "REMOVE" | "RESTORE") {
    const res = await fetch(`/api/admin/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-600">状態</label>
        <select value={status} onChange={e => { setPage(1); setStatus(e.target.value as any); }} className="rounded border px-2 py-1 text-sm">
          <option value="ALL">すべて</option>
          <option value="PUBLISHED">公開中</option>
          <option value="REMOVED">削除済</option>
        </select>

        <input value={q} onChange={e => { setPage(1); setQ(e.target.value); }} placeholder="本文検索" className="rounded border px-3 py-1.5 text-sm" />
        <input value={user} onChange={e => { setPage(1); setUser(e.target.value); }} placeholder="ユーザID" className="rounded border px-3 py-1.5 text-sm" />

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { setPage(p => Math.max(1, p - 1)); }} disabled={page === 1} className="rounded border px-2 py-1 text-sm disabled:opacity-50">前へ</button>
          <span className="text-sm text-gray-600">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!hasNext} className="rounded border px-2 py-1 text-sm disabled:opacity-50">次へ</button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <table className="w-full table-fixed border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="w-40 px-2">対象</th>
              <th className="px-2">コメント</th>
              <th className="w-44 px-2">ユーザ/時刻</th>
              <th className="w-32 px-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isRemoved = !!r.deletedAt;
              return (
                <tr key={r.id} className="rounded-lg bg-gray-50 align-top">
                  <td className="px-2 text-sm">
                    <div className="font-medium line-clamp-2">{r.post.title}</div>
                    <a href={`/posts/${r.post.id}`} target="_blank" className="text-xs text-blue-600 hover:underline">投稿を開く</a>
                  </td>

                  <td className="px-2">
                    <div className="text-xs text-gray-600 mb-1">
                      <span className={`rounded px-2 py-0.5 ${isRemoved ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {isRemoved ? "削除済" : "公開中"}
                      </span>
                    </div>
                    <blockquote className="rounded border bg-white p-2 text-sm whitespace-pre-wrap">
                      {r.content}
                    </blockquote>
                  </td>

                  <td className="px-2 text-xs text-gray-600">
                    <div><span className="rounded bg-gray-100 px-1.5 py-0.5 mr-1">ユーザ</span><code>{r.identityId ?? "-"}</code></div>
                    <div className="mt-1">作成: <TimeText iso={r.createdAt} /></div>
                    {r.deletedAt && <div className="mt-1">削除: <TimeText iso={r.deletedAt} /></div>}
                    <div className="mt-1">ID: <code className="text-[11px]">{r.id}</code></div>
                  </td>

                  <td className="px-2">
                    {isRemoved ? (
                      <button onClick={() => updateOne(r.id, "RESTORE")} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">復元</button>
                    ) : (
                      <button onClick={() => updateOne(r.id, "REMOVE")} className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">削除</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-sm text-gray-500">該当するコメントがありません。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
