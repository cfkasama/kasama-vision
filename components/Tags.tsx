// components/TagsList.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  /** 自治体スコープにしたい場合だけ指定（IDのほうが早い） */
  municipalityId?: string;
  municipalityName?: string;
  /** ボタンやリンク生成に使う slug（/m/[slug]/posts?tag=.. を作る用） */
  municipalitySlug?: string;
  /** 見出し */
  title?: string;
  /** 最大件数 */
  limit?: number;
  /** 「投稿する」ボタンを出すか */
  showCreateButton?: boolean;
};

export default async function TagsList({
  municipalityId,
  municipalitySlug,
  municipalityName,
  limit = 200,
  showCreateButton = true,
}: Props) {
  // 1) PostTag を PUBLISHED の Post に絞って集計（必要なら自治体IDで絞る）
  const grouped = await prisma.postTag.groupBy({
    by: ["tagId"],
    _count: { tagId: true },
    where: {
      post: {
        status: "PUBLISHED",
        ...(municipalityId ? { municipalityId } : {}),
      },
    },
    orderBy: { _count: { tagId: "desc" } },
    take: limit,
  });

   const title =
    (municipalityName ? `${municipalityName} のタグ一覧` : "タグ一覧");

  if (grouped.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-600">まだタグの付いた投稿がありません。</p>
        {showCreateButton && (
          <Link
            href={
              municipalitySlug
                ? `/new?municipality=${encodeURIComponent(municipalitySlug)}`
                : "/new"
            }
            className="text-sm text-blue-600 hover:underline"
          >
            最初の投稿をしてタグを作る
          </Link>
        )}
      </div>
    );
  }

  // 2) タグ名をまとめて取得
  const tagIds = grouped.map((g) => g.tagId);
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(tags.map((t) => [t.id, t.name]));

  // 3) 表示用に整形
  const rows = grouped
    .map((g) => ({
      id: g.tagId,
      name: nameById.get(g.tagId),
      count: g._count.tagId,
    }))
    .filter((r) => r.name);

  // 一覧ページへのリンク先（グローバル or 自治体スコープ）
  const listHref = (tagName: string) =>
    municipalitySlug
      ? `/m/${municipalitySlug}/posts?tag=${encodeURIComponent(tagName)}`
      : `/posts?tag=${encodeURIComponent(tagName)}`;

  const createHref = municipalitySlug
    ? `/new?municipality=${encodeURIComponent(municipalitySlug)}`
    : "/new";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {showCreateButton && (
          <Link
            href={createHref}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
          >
            投稿する
          </Link>
        )}
      </header>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r!.id}>
            <Link
              href={listHref(r!.name!)}
              className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-gray-50"
            >
              <span className="truncate">#{r!.name}</span>
              <span className="text-sm text-gray-500">{r!.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
