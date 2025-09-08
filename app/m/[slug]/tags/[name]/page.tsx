// app/tags/[name]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";     // SSGでコケないように
export const revalidate = 0;                // 常に最新
export const dynamicParams = true;          // 生成してないパラメータでもOK

type Props = { params: { name: string } };

export default async function TagPage({ params }: Props) {
  const tagName = decodeURIComponent(params.name);

  // タグが存在しなくても404にしない（空結果表示）
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      tags: { some: { tag: { name: tagName } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { tags: { include: { tag: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">#{tagName}</h1>
        <Link
          href={`/new?tags=${encodeURIComponent(tagName)}`}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
        >
          このタグで投稿
        </Link>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-gray-600">まだこのタグの投稿はありません。</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-lg border p-4">
              <h3 className="mb-1 font-semibold">
                <Link href={`/posts/${p.id}`} className="hover:underline">
                  {p.title}
                </Link>
              </h3>
              <p className="text-sm text-gray-600">
                {p.content?.slice(0, 140)}
                {p.content && p.content.length > 140 ? "…" : ""}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((t: any) => (
                    <Link
                      key={t.tagId}
                      href={`/tags/${encodeURIComponent(t.tag.name)}`}
                      className="rounded-full bg-gray-100 px-2 py-0.5"
                    >
                      #{t.tag.name}
                    </Link>
                  ))}
                </div>
                <div>👍 {p.likeCount}　⭐ {p.recCount}　💬 {p.cmtCount}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← トップへ戻る</Link>
      </div>
    </div>
  );
}
