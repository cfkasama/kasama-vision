// components/posts/PostsList.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
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

type Props = {
  // /posts なら undefined、/m/[slug]/posts なら slug
  municipalitySlug?: string;
  // ルーティングのベース（リンクを正しく張るため）
  basePath: string; // 例: "/posts" or `/m/${slug}/posts`
  // Next から受け取る searchParams をそのまま
  searchParams: Record<string, string | string[] | undefined>;
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

  // 自治体スコープはリレーションで絞り込める
  const where: any = {
    ...(status ? { status } : { status: "PUBLISHED" }),
    ...(type ? { type } : {}),
    ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
    ...(minLikes ? { likeCount: { gte: minLikes } } : {}),
    ...(municipalitySlug ? { municipality: { slug: municipalitySlug } } : {}),
  };

  return { type, tag, status, sort, minLikes, page, take, skip, orderBy, where };
}

// クエリ文字列生成（現在の条件をベースに上書き）
function buildHref(basePath: string, current: Record<string, any>, override: Record<string, any>) {
  const merged = { ...current, ...override };
  const q = Object.entries(merged)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `${basePath}?${q}` : basePath;
}

const labelByType: Partial<Record<PostType, string>> = {
  CATCHPHRASE: "キャッチフレーズ",
  VISION: "ビジョン",
  CONSULTATION: "相談",
  PROPOSAL: "提案",
  REPORT_LIVE: "住めなかった報告",
  REPORT_WORK: "働けなかった報告",
  REPORT_TOURISM: "不満がある報告",
};

export default async function PostsList({ municipalitySlug, basePath, searchParams }: Props) {
  const { type, tag, status, sort, minLikes, page, take, skip, orderBy, where } = parseParams(
    searchParams,
    municipalitySlug
  );

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      take,
      skip,
      include: { tags: { include: { tag: true } } },
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));

  const title =
    (municipalitySlug ? "自治体別 " : "") +
    ((type ? labelByType[type] : tag ? `タグ: ${tag}` : "投稿") +
      (status === "REALIZED" ? "（実現）" : minLikes ? `（いいね${minLikes}+）` : ""));

  const currentQuery = { type, tag, status, sort };

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
            href={buildHref(basePath, { ...currentQuery, page: 1 }, { sort: key })}
            className={`rounded-lg border px-3 py-1.5 hover:bg-gray-50 ${sort === key ? "bg-white" : ""}`}
          >
            {key === "new" ? "新着" : key === "hot" ? "トレンド" : key === "likes" ? "いいね順" : "コメント多い順"}
          </Link>
        ))}
      </div>

      {/* リスト */}
      <section className="grid gap-4 md:grid-cols-3">
        {posts.map((p) => (
          <div key={p.id} className="rounded-xl border bg-white p-3 flex flex-col">
            <header className="mb-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                {labelByType[p.type as PostType] ?? p.type}
              </span>
              {p.likeCount >= 100 && (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs">100いいね</span>
              )}
              {p.status === "REALIZED" && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs">実現</span>
              )}
            </header>

            <h3 className="mb-1 line-clamp-2 font-semibold">
              <Link href={`/posts/${p.id}`} className="hover:underline">
                {p.title}
              </Link>
            </h3>

            <p className="flex-1 text-sm text-gray-600">
              {p.content?.slice(0, 140)}
              {p.content && p.content.length > 140 ? "…" : ""}
            </p>

            <footer className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex flex-wrap gap-1">
                {p.tags.map((t: any) => (
                  <Link
                    key={t.tagId}
                    href={buildHref(basePath, { ...currentQuery, page: 1, type: undefined }, { tag: t.tag.name })}
                    className="inline-flex rounded-full bg-gray-100 px-2 py-0.5"
                  >
                    {t.tag.name}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <PostReactions postId={p.id} likeCount={p.likeCount} compact />
                <span>💬 {p.cmtCount}</span>
              </div>
            </footer>
          </div>
        ))}
      </section>

      {/* ページネーション */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <Link
          aria-disabled={page <= 1}
          href={buildHref(basePath, { ...currentQuery, page }, { page: Math.max(1, page - 1) })}
          className={`rounded border px-3 py-1.5 text-sm ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-gray-50"}`}
        >
          前へ
        </Link>
        <span className="text-sm text-gray-600">
          {page} / {totalPages}
        </span>
        <Link
          aria-disabled={page >= totalPages}
          href={buildHref(basePath, { ...currentQuery, page }, { page: Math.min(totalPages, page + 1) })}
          className={`rounded border px-3 py-1.5 text-sm ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-gray-50"}`}
        >
          次へ
        </Link>
      </div>
    </>
  );
}