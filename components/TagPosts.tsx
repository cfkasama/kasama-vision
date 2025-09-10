// components/TagPosts.tsx
import Link from "next/link";
import type { Post, PostTag, Tag } from "@prisma/client";

type PostWithTags = Post & {
  tags: (PostTag & { tag: Tag })[];
};

export default function TagPosts({
  tagName,
  posts,
  municipalitySlug,
}: {
  tagName: string;
  posts: PostWithTags[];
  municipalitySlug?: string; // m/[slug] 配下なら slug を渡す
}) {
  // リンクベース（全体 or 自治体配下）
  const postLink = (id: string) =>
    municipalitySlug ? `/m/${municipalitySlug}/posts/${id}` : `/posts/${id}`;
  const tagLink = (name: string) =>
    municipalitySlug ? `/m/${municipalitySlug}/tags/${encodeURIComponent(name)}` : `/tags/${encodeURIComponent(name)}`;
  const newLink = municipalitySlug
    ? `/m/${municipalitySlug}/new?tags=${encodeURIComponent(tagName)}`
    : `/new?tags=${encodeURIComponent(tagName)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">#{tagName}</h1>
        <Link
          href={newLink}
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
                <Link href={postLink(p.id)} className="hover:underline">
                  {p.title}
                </Link>
              </h3>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <Link
                      key={t.tagId}
                      href={tagLink(t.tag.name)}
                      className="rounded-full bg-gray-100 px-2 py-0.5"
                    >
                      #{t.tag.name}
                    </Link>
                  ))}
                </div>
                <div>
                  👍 {p.likeCount}　💬 {p.cmtCount}
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
