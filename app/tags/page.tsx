// app/tags/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getTopTags() {
  // 既存の TagTop5 テーブルを優先して使う
  const top = await prisma.tagTop5.findMany({
    orderBy: { count: "desc" },
    take: 20,
  });

  // 保険：空だったら PostTag を集計
  if (top.length > 0) {
    return top.map((t) => ({ name: t.tagName, count: t.count }));
  }

  // Fallback: groupBy（必要に応じてSELECTに変更可）
  const grouped = await prisma.postTag.groupBy({
    by: ["tagId"],
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 20,
  });

  const withNames = await Promise.all(
    grouped.map(async (g) => {
      const tag = await prisma.tag.findUnique({ where: { id: g.tagId } });
      return { name: tag?.name ?? "(unknown)", count: g._count.tagId };
    })
  );

  return withNames;
}

export default async function TagsIndexPage() {
  const tags = await getTopTags();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">タグランキング</h1>
      {tags.length === 0 ? (
        <p className="text-sm text-gray-600">まだタグがありません。</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.name}>
              <Link
                href={`/tags/${encodeURIComponent(t.name)}`}
                className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              >
                #{t.name}（{t.count}）
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
