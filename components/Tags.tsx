// app/tags/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function TagsIndexPage() {
  try {
    // 1) PostTag を PUBLISHED の Post に絞って集計
    const grouped = await prisma.postTag.groupBy({
      by: ["tagId"],
      _count: { tagId: true },
      where: { post: { status: "PUBLISHED" } },
      orderBy: { _count: { tagId: "desc" } },
      take: 200, // 必要に応じて上限
    });

    if (grouped.length === 0) {
      return (
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-bold">タグ一覧</h1>
          <p className="text-sm text-gray-600">まだタグの付いた投稿がありません。</p>
          <Link href="/new" className="text-sm text-blue-600 hover:underline">
            最初の投稿をしてタグを作る
          </Link>
        </div>
      );
    }

    // 2) タグ名をまとめて取得
    const ids = grouped.map((g) => g.tagId);
    const tags = await prisma.tag.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameById = new Map(tags.map((t) => [t.id, t.name]));

    // 3) 表示用データ (名前が無いものは除外)
    const rows = grouped
      .map((g) => ({
        id: g.tagId,
        name: nameById.get(g.tagId),
        count: g._count.tagId,
      }))
      .filter((r) => r.name)
      .slice(0, 200);

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-end justify-between gap-3">
          <h1 className="text-2xl font-bold">タグ一覧</h1>
          <Link
            href="/new"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
          >
            投稿する
          </Link>
        </header>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/tags/${encodeURIComponent(r.name!)}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50"
              >
                <span className="truncate">#{r.name}</span>
                <span className="text-sm text-gray-500">{r.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  } catch (e) {
    // アプリケーションエラーを UI に落とす
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">タグ一覧</h1>
        <p className="text-sm text-red-600">
          タグ一覧の読み込みで問題が発生しました。時間をおいて再度お試しください。
        </p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← トップへ戻る
        </Link>
      </div>
    );
  }
}
