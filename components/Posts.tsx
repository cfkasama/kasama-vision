// components/Posts.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Pill, Chip } from "@/components/ui";
import PostReactions from "@/components/PostReactions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SortKey = "new" | "likes" | "comments" | "hot";
type PostType =
  | "CATCHPHRASE"
  | "VISION"
  | "CONSULTATION"
  | "PROPOSAL"
  | "REPORT_LIVE"
  | "REPORT_WORK"
  | "REPORT_TOURISM";

const labelByType: Partial<Record<PostType, string>> = {
  CATCHPHRASE: "キャッチフレーズ",
  VISION: "ビジョン",
  CONSULTATION: "相談",
  PROPOSAL: "提案",
  REPORT_LIVE: "住めなかった報告",
  REPORT_WORK: "働けなかった報告",
  REPORT_TOURISM: "不満がある報告",
};

function parseParams(
  searchParams: Record<string, string | string[] | undefined>,
  municipalitySlug?: string
) {
  const get = (k: string) =>
    Array.isArray(searchParams[k]) ? searchParams[k]?.[0] : searchParams[k];

  const type = (get("type") as PostType | undefined) || undefined;
  const tag = get("tag") ?? undefined;
  const status = (get("status") as "PUBLISHED" | "REALIZED" | "REMOVED" | undefined) ?? undefined;
  const sort = (get("sort") as SortKey | undefined) ?? "new";
  const minLikes = get("minLikes") ? Number(get("minLikes")) : undefined;
  const page = Math.max(1, Number(get("page") ?? "1"));
  const take = 20;
  const skip = (page - 1) * take;

  const orderBy =
    sort === "likes"
      ? { likeCount: "desc" as const }
      : sort === "comments"
      ? { cmtCount: "desc" as const }
      : sort === "hot"
      ? { hotScore: "desc" as const }
      : { createdAt: "desc" as const };

  const where: any = {
    ...(status ? { status } : { status: "PUBLISHED" }),
    ...(type ? { type } : {}),
    ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
    ...(minLikes ? { likeCount: { gte: minLikes } } : {}),
    ...(municipalitySlug ? { municipality: { slug: municipalitySlug } } : {}),
  };

  return { type, tag, status, sort, minLikes, page, take, skip, orderBy, where };
}

export default async function Posts({
  searchParams,
  municipalitySlug,   // 例: "kasama"（自治体別ページから使用）
  municipalityName,   // 例: "笠間市"（見出し用に任意）
}: {
  searchParams: Record<string, string | string[] | undefined>;
  municipalitySlug?: string;
  municipalityName?: string;
}) {
  const { type, tag, status, sort, minLikes, page, take, skip, orderBy, where } =
    parseParams(searchParams, municipalitySlug);

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      take,
      skip,
      include:{ municipality: true },
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));

  const title =
    (municipalityName ? `${municipalityName} ` : "") +
    ((type ? labelByType[type] : tag ? `タグ: ${tag}` : "投稿") +
      (status === "REALIZED" ? "（実現）" : minLikes ? `（いいね${minLikes}+）` : ""));

  const basePath = municipalitySlug ? `/m/${municipalitySlug}/posts` : "/posts";
  const queryBase = (q: Record<string, string | number | undefined>) =>
    basePath +
    "?" +
    Object.entries({ type, tag, status, sort, ...q })
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");

  return (
    <>
      <section className="mb-4">
        <h1 className="text-2xl font-bold">{title} 一覧</h1>
        <p className="text-sm text-gray-600">全 {total} 件</p>
      </section>

      {/* ソートタブ */}
      <div className="mb-4 flex gap-2 text-sm">
        {(["new", "hot", "likes", "comments"] as SortKey[]).map((key) => (
          <Link
            key={key}
            href={queryBase({ page: 1, sort: key })}
            className={`rounded-lg border px-3 py-1.5 hover:bg-gray-50 ${sort === key ? "bg-white" : ""}`}
          >
            {key === "new" ? "新着" : key === "hot" ? "トレンド" : key === "likes" ? "いいね順" : "コメント多い順"}
          </Link>
        ))}
      </div>

      {/* リスト */}
      <section className="grid gap-4 md:grid-cols-3">
        {posts.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <header className="mb-1 flex items-center gap-2">
              <Pill>{labelByType[p.type as PostType] ?? p.type}</Pill>
              {p.likeCount >= 100 && <Pill color="gold">100いいね</Pill>}
              {p.status === "REALIZED" && <Pill color="green">実現</Pill>}
            </header>
            <h3 className="mb-1 line-clamp-2 font-semibold">
              <Link href={`${basePath}/${p.id}`} className="hover:underline">
                {p.title}
              </Link>
            </h3>
            <footer className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex flex-wrap gap-1">
                <Link
                  href={`/m/${p.municipality.slug}`}
                  className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                >
                  {p.municipality.name}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <PostReactions postId={p.id} likeCount={p.likeCount} compact />
                <span>💬 {p.cmtCount}</span>
              </div>
            </footer>
          </Card>
        ))}
      </section>

      {/* ページネーション */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <Link
          aria-disabled={page <= 1}
          href={queryBase({ page: Math.max(1, page - 1) })}
          className={`rounded border px-3 py-1.5 text-sm ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-gray-50"}`}
        >
          前へ
        </Link>
        <span className="text-sm text-gray-600">
          {page} / {totalPages}
        </span>
        <Link
          aria-disabled={page >= totalPages}
          href={queryBase({ page: Math.min(totalPages, page + 1) })}
          className={`rounded border px-3 py-1.5 text-sm ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-gray-50"}`}
        >
          次へ
        </Link>
      </div>
    </>
  );
}
