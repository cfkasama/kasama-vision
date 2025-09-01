// app/tags/[name]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";


export const dynamic = "force-dynamic"; // ビルド時のDB依存を避ける

type Props = { params: { name: string } };

async function getData(tagName: string) {
  // タグの存在チェック
  const tag = await prisma.tag.findUnique({ where: { name: tagName } });

  // タグが無くても 404 ではなく空リストを返したいなら、ここで null を許容してもOK
  // 既存リンク前提なら、ない場合は404でもよい
  if (!tag) return { tag: null, posts: [] as any[] };

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      tags: { some: { tag: { name: tagName } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { tags: { include: { tag: true } } },
  });

  return { tag, posts };
}

export default async function TagPage({ params }: Props) {
  const tagName = params.name; // Next.jsは基本デコード済み（日本語タグOK）
  const { tag, posts } = await getData(tagName);

  // タグが全く存在しない場合は 404 にする場合↓（存在しないタグリンクを避けるならこちら推奨）
  if (!tag) notFound();

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
        <p className="text-sm text-gray-600">
          まだこのタグの投稿はありません。最初の1件を投稿してみませんか？
        </p>
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
                <div>
                  👍 {p.likeCount}　⭐ {p.recCount}　💬 {p.cmtCount}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← トップへ戻る
        </Link>
      </div>
    </div>
  );
}
