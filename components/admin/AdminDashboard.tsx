"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReportsPanel from "./ReportsPanel";
import CommentsPanel from "./CommentsPanel";
import UsersPanel from "./UsersPanel";
import AuditPanel from "./AuditPanel";
import { signOut } from "next-auth/react";
import { TimeText } from "./TimeText";

type Post = {
  id: string;
  title: string;
  content: string;
  type: string; // "VISION" など
  status: "PUBLISHED" | "REMOVED" | "REALIZED";
  likeCount: number;
  recCount: number;
  cmtCount: number;
  createdAt: string;
  realizedAt?: string | null;
  identityId: string | null;
  municipalityId: string | null;
  municipality?: { id: string; name: string; slug?: string } | null;
};

export default function AdminDashboard({ me }: { me: any }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [sel, setSel] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.entries(sel).filter(([, v]) => v).map(([k]) => k),
    [sel]
  );

  const [tab, setTab] = useState<"posts" | "reports" | "comments" | "users" | "audit">("posts");

  const fetchPosts = useCallback(async (status: "ALL" | "PUBLISHED" | "REMOVED" | "REALIZED" = "ALL") => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`/api/admin/posts?limit=200&status=${status}`, { cache: "no-store" });
      if (!r.ok) {
        if (r.status === 401) throw new Error("未ログインまたは権限がありません。");
        throw new Error("取得に失敗しました。");
      }
      const j = await r.json();
      setPosts(j.posts || []);
      setSel({});
    } catch (e: any) {
      setErr(e?.message || "取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const selectAll = useCallback(() => {
    setSel((s) => {
      const next = { ...s };
      for (const p of posts) next[p.id] = true;
      return next;
    });
  }, [posts]);
  const clearSelect = useCallback(() => setSel({}), []);

  async function act(action: "REMOVE" | "REALIZE" | "RESTORE") {
    if (selectedIds.length === 0) return;

    const mapStatus = (a: "REMOVE" | "REALIZE" | "RESTORE"): Post["status"] =>
      a === "REMOVE" ? "REMOVED" : a === "REALIZE" ? "REALIZED" : "PUBLISHED";

    const before = posts;
    const after: Post[] = posts.map((p) =>
      selectedIds.includes(p.id)
        ? {
            ...p,
            status: mapStatus(action),
            realizedAt: action === "REALIZE" ? new Date().toISOString() : p.realizedAt,
          }
        : p
    );
    setPosts(after);
    setSel({});

    try {
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, postIds: selectedIds }),
      });
      if (!res.ok) throw new Error("moderate_failed");
    } catch {
      setPosts(before);
      alert("更新に失敗しました。もう一度お試しください。");
    }
  }

  const statusBadge = (s: Post["status"]) =>
    s === "PUBLISHED" ? (
      <span className="rounded bg-blue-100 px-2 py-0.5">公開</span>
    ) : s === "REMOVED" ? (
      <span className="rounded bg-red-100 px-2 py-0.5">削除</span>
    ) : (
      <span className="rounded bg-green-100 px-2 py-0.5">実現</span>
    );

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">管理ダッシュボード</h1>
        <div className="text-sm text-gray-600">
          管理者
          <button onClick={() => signOut()} className="ml-3 rounded border px-2 py-1 hover:bg-gray-50">
            ログアウト
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab("posts")}   className={`rounded border px-3 py-1.5 ${tab === "posts" ? "bg-white" : ""}`}>投稿レビュー</button>
        <button onClick={() => setTab("reports")} className={`rounded border px-3 py-1.5 ${tab === "reports" ? "bg-white" : ""}`}>通報</button>
        <button onClick={() => setTab("comments")}className={`rounded border px-3 py-1.5 ${tab === "comments" ? "bg-white" : ""}`}>コメント</button>
        <button onClick={() => setTab("users")}   className={`rounded border px-3 py-1.5 ${tab === "users" ? "bg-white" : ""}`}>ユーザー</button>
        <button onClick={() => setTab("audit")}   className={`rounded border px-3 py-1.5 ${tab === "audit" ? "bg-white" : ""}`}>監査ログ</button>
      </div>

      {/* POST 一覧 */}
      {tab === "posts" ? (
        <div className="rounded-xl border bg-white p-3">
          {/* 操作列 */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button onClick={() => act("REMOVE")}  className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">強制削除</button>
            <button onClick={() => act("REALIZE")} className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">実現にする</button>
            <button onClick={() => act("RESTORE")} className="rounded border px-3 py-1.5 hover:bg-gray-50">復元</button>

            <div className="ml-auto flex items-center gap-2">
              {/* 簡易フィルタ */}
              <select
                className="rounded border px-2 py-1 text-sm"
                onChange={(e) => fetchPosts(e.target.value as any)}
                defaultValue="ALL"
                aria-label="ステータス絞り込み"
              >
                <option value="ALL">すべて</option>
                <option value="PUBLISHED">公開</option>
                <option value="REMOVED">削除</option>
                <option value="REALIZED">実現</option>
              </select>

              <button onClick={selectAll}  className="rounded border px-2 py-1 text-sm hover:bg-gray-50" title="この一覧の全行を選択">全選択</button>
              <button onClick={clearSelect}className="rounded border px-2 py-1 text-sm hover:bg-gray-50">解除</button>
              <button onClick={() => fetchPosts()} className="rounded border px-2 py-1 text-sm hover:bg-gray-50" title="最新の状態に更新">更新</button>
              <span className="text-sm text-gray-500">選択: {selectedIds.length}件</span>
            </div>
          </div>

          {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
          {loading && <p className="mb-2 text-sm text-gray-600">読込中…</p>}

          {/* 一覧 */}
          <table className="w-full table-fixed border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="w-10 px-2">選</th>
                <th className="w-30 px-2">種別</th>
                <th className="px-2">タイトル</th>
                <th className="w-24 px-2">状態</th>
                <th className="w-36 px-2">指標</th>
                <th className="w-36 px-2">日時</th>
                <th className="w-50 px-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="rounded-lg bg-gray-50 align-top">
                  <td className="px-2">
                    <input
                      type="checkbox"
                      checked={!!sel[p.id]}
                      onChange={(e) => setSel((s) => ({ ...s, [p.id]: e.target.checked }))}
                      aria-label="選択"
                    />
                  </td>
                  <td className="px-2 text-xs">
                    <span className="rounded bg-gray-200 px-2 py-0.5">{p.type}</span>
                  </td>
                  <td className="px-2">
                    <div className="font-medium">{p.title}</div>
                    <div className="line-clamp-2 text-xs text-gray-600">{p.content}</div>
                    <a className="mt-1 inline-block text-xs text-blue-600 hover:underline" href={`/posts/${p.id}`} target="_blank" rel="noreferrer">
                      投稿を開く
                    </a>
                    {/* 自治体名（あれば表示、リンクも可） */}
                    <div className="mt-1 text-[11px] text-gray-600">
                      {p.municipality?.name ? (
                        <>
                          自治体: {p.municipality.name}
                          {p.municipality?.slug && (
                            <a
                              className="ml-1 underline hover:no-underline"
                              href={`/m/${p.municipality.slug}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              （ページ）
                            </a>
                          )}
                        </>
                      ) : p.municipalityId ? (
                        <>自治体ID: {p.municipalityId}</>
                      ) : (
                        <>自治体: 不明</>
                      )}
                    </div>
                  </td>
                  <td className="px-2 text-xs">{statusBadge(p.status)}</td>
                  <td className="px-2 text-xs text-gray-700">👍{p.likeCount} / ⭐{p.recCount} / 💬{p.cmtCount}</td>
                  <td className="px-2 text-xs text-gray-500">
                    <div><TimeText iso={p.createdAt} /></div>
                    {p.realizedAt && <div>実現:<TimeText iso={p.realizedAt} /></div>}
                  </td>
                  <td className="px-2 text-xs text-gray-500">
                    {p.identityId && <div>User:{p.identityId}</div>}
                    {p.municipalityId && !p.municipality?.name && <div>MuniID:{p.municipalityId}</div>}
                  </td>
                </tr>
              ))}
              {posts.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-gray-500">対象の投稿がありません。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : tab === "reports" ? (
        <ReportsPanel />
      ) : tab === "comments" ? (
        <CommentsPanel />
      ) : tab === "users" ? (
        <UsersPanel />
      ) : (
        <AuditPanel />
      )}
    </div>
  );
}