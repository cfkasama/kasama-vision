// components/admin/ReportsPanel.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Report = {
  id: string;
  reason: string;                 // ← これで POST/COMMENT を判定
  note?: string;                  // ← 通報本文が入っている
  createdAt: string;
  post: {
    id: string;
    title: string;
    type: string;
    status: string;
    likeCount: number;
    recCount: number;
    cmtCount: number;
    createdAt: string;
  };
};

// reasonの判定ルール（必要ならここの条件だけ調整してね）
function isCommentReason(reason: string) {
  // 例: "COMMENT", "COMMENT_SPAM", "COMMENT_ABUSE" などを想定
  return /comment/i.test(reason);
}

// 表示用ラベル（お好みで増やせる）
function reasonLabel(reason: string) {
  const key = reason.toUpperCase();
  if (key.includes("SPAM")) return "スパム";
  if (key.includes("ABUSE")) return "誹謗中傷";
  if (key.includes("OFF") && key.includes("TOPIC")) return "話題違い";
  if (key.includes("ILLEGAL")) return "違法";
  if (key.includes("COMMENT")) return "コメント関連";
  return reason; // 未マッピングはそのまま
}

export default function ReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const selected = useMemo(
    () => Object.entries(sel).filter(([, v]) => v).map(([k]) => k),
    [sel]
  );
  const [note, setNote] = useState("");

  async function load() {
    const r = await fetch("/api/admin/reports", { cache: "no-store" });
    const j = await r.json();
    setReports(j.reports || []);
  }
  useEffect(() => { load(); }, []);

  async function act(action: "DISMISS" | "REMOVE_POST" | "RESTORE_POST" | "MARK_RESOLVED") {
    if (!selected.length) return;
    const payload: any = { action, reportIds: selected };
    const trimmed = note.trim();
    if ((action === "MARK_RESOLVED" || action === "DISMISS") && trimmed) {
      payload.note = trimmed;
    }
    await fetch("/api/admin/reports/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await load(); setSel({}); setNote("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => act("REMOVE_POST")} className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">
          対象投稿を削除
        </button>
        <button onClick={() => act("RESTORE_POST")} className="rounded border px-3 py-1.5 hover:bg-gray-50">
          対象投稿を公開
        </button>
        <button onClick={() => act("MARK_RESOLVED")} className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">
          対応済みにする
        </button>
        <button onClick={() => act("DISMISS")} className="rounded border px-3 py-1.5 hover:bg-gray-50">
          棄却
        </button>
        <span className="ml-auto text-sm text-gray-500">選択: {selected.length}件</span>
      </div>

      <label className="block text-sm">
        管理メモ（任意）
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          placeholder="対応理由・判断根拠など"
        />
      </label>

      <div className="rounded-xl border bg-white p-3">
        <table className="w-full table-fixed border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="w-10 px-2">選</th>
              <th className="w-28 px-2">種別</th>
              <th className="w-44 px-2">対象</th>
              <th className="px-2">通報内容 / 理由</th>
              <th className="w-44 px-2">指標/日時</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const isComment = isCommentReason(r.reason);
              const reasonText = reasonLabel(r.reason);
              const postLink = `/posts/${r.post.id}`;
              return (
                <tr key={r.id} className="rounded-lg bg-gray-50 align-top">
                  <td className="px-2">
                    <input
                      type="checkbox"
                      checked={!!sel[r.id]}
                      onChange={(e) => setSel((s) => ({ ...s, [r.id]: e.target.checked }))}
                      aria-label="選択"
                    />
                  </td>

                  {/* 種別 */}
                  <td className="px-2 text-xs">
                    <div className={`inline-block rounded px-2 py-0.5 ${isComment ? "bg-purple-100" : "bg-blue-100"}`}>
                      {isComment ? "コメント" : "投稿"}
                    </div>
                    <div className="mt-1 inline-block rounded bg-gray-200 px-2 py-0.5">
                      {reasonText}
                    </div>
                  </td>

                  {/* 対象（投稿タイトル & リンク） */}
                  <td className="px-2 text-sm">
                    <div className="font-medium line-clamp-2">{r.post.title}</div>
                    <a className="text-xs text-blue-600 hover:underline" href={postLink} target="_blank">
                      対象を開く
                    </a>
                  </td>

                  {/* 通報内容 / 理由（noteを本文として表示） */}
                  <td className="px-2 text-sm">
                    {r.note ? (
                      <blockquote className="rounded border bg-white p-2 text-xs text-gray-800 whitespace-pre-wrap">
                        {r.note}
                      </blockquote>
                    ) : (
                      <span className="text-xs text-gray-500">（通報本文なし）</span>
                    )}
                    <div className="mt-1 text-[11px] text-gray-600">
                      種別: <span className="rounded bg-gray-200 px-2 py-0.5">{r.post.type}</span>
                      <span className={`ml-1 rounded px-2 py-0.5 ${r.post.status === "REMOVED" ? "bg-red-100" : "bg-blue-100"}`}>
                        {r.post.status}
                      </span>
                    </div>
                  </td>

                  {/* 指標 / 日時 */}
                  <td className="px-2 text-xs text-gray-500">
                    <div className="mb-1 text-gray-700">
                      👍{r.post.likeCount} / ⭐{r.post.recCount} / 💬{r.post.cmtCount}
                    </div>
                    <div>通報: {new Date(r.createdAt).toLocaleString()}</div>
                    <div>投稿: {new Date(r.post.createdAt).toLocaleDateString()}</div>
                  </td>
                </tr>
              );
            })}
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                  OPENの通報はありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}