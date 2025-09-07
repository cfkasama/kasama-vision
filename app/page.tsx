// app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PostType =
  | "CATCHPHRASE"
  | "VISION"
  | "CONSULTATION"
  | "PROPOSAL"
  | "REPORT_LIVE"
  | "REPORT_WORK"
  | "REPORT_TOURISM";

async function countsByType() {
  const rows = await prisma.post.groupBy({
    by: ["type"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.type, r._count._all]));
  const get = (t: PostType) => (map[t] ?? 0) as number;
  return {
    catchphrase: get("CATCHPHRASE"),
    vision: get("VISION"),
    consultation: get("CONSULTATION"),
    proposal: get("PROPOSAL"),
    reportLive: get("REPORT_LIVE"),
    reportWork: get("REPORT_WORK"),
    reportTourism: get("REPORT_TOURISM"),
  };
}

async function getTopCatchphrase() {
  return prisma.post.findFirst({
    where: { status: "PUBLISHED", type: "CATCHPHRASE" },
    orderBy: { likeCount: "desc" },
    include: { tags: { include: { tag: true } } },
  });
}

async function getTopVisions() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "VISION" },
    orderBy: { likeCount: "desc" },
    take: 3,
    include: { tags: { include: { tag: true } } },
  });
}

async function getHundredLikeProposalsCount() {
  return prisma.post.count({
    where: { status: "PUBLISHED", type: "PROPOSAL", likeCount: { gte: 100 } },
  });
}
async function getRealizedProposalsCount() {
  return prisma.post.count({
    where: { status: "REALIZED", type: "PROPOSAL" },
  });
}

// タグランキング：TagTop5 優先、無ければ PostTag から集計
async function getTopTags() {
  try {
    const top = await prisma.tagTop5.findMany({
      orderBy: { count: "desc" },
      take: 5,
    });
    if (top.length)
      return top.map((t) => ({ id: t.id, name: t.tagName, count: t.count }));
  } catch {}
  const grouped = await prisma.postTag.groupBy({
    by: ["tagId"],
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 5,
  });
  const tags = await prisma.tag.findMany({
    where: { id: { in: grouped.map((g) => g.tagId) } },
  });
  return grouped.map((g) => ({
    id: g.tagId,
    name: tags.find((t) => t.id === g.tagId)?.name ?? "",
    count: g._count.tagId,
  }));
}

async function getTopMunicipalitiesWeekly(limit = 10, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.post.groupBy({
    by: ["municipalityId"],
    where: {
      status: "PUBLISHED",
      // municipalityId: { not: null }, // ← 型的にNGなので外す
      createdAt: { gte: since },
    },
    _count: { _all: true },
    orderBy: { _count: { _all: "desc" } },
    take: limit,
  });

  // null/undefined を除外（古いデータがあっても安全）
  const ids = rows.map(r => r.municipalityId).filter((id): id is string => !!id);
  if (!ids.length) return [];

  const municipalities = await prisma.municipality.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true },
  });

  return rows
    .map(r => {
      if (!r.municipalityId) return null; // 念のため
      const m = municipalities.find(mm => mm.id === r.municipalityId);
      return m ? { id: m.id, name: m.name, slug: m.slug, count: r._count._all } : null;
    })
    .filter(Boolean) as { id: string; name: string; slug: string; count: number }[];
}

export default async function Home() {
  const [
    counts,
    topCatch,
    topVis,
    hundredLikeCount,
    realizedCount,
    topTags,
    topMunicipalities,
  ] = await Promise.all([
    countsByType(),
    getTopCatchphrase(),
    getTopVisions(),
    getHundredLikeProposalsCount(),
    getRealizedProposalsCount(),
    getTopTags(),
    getTopMunicipalitiesWeekly(10, 7),
  ]);

  return (
    <>
      <section className="mb-6">
        <h1 className="text-2xl font-bold">みんなで創る、未来の自治体</h1>
        <p className="text-sm text-gray-600">
          匿名で投稿、いいねで可視化、実現へ。
        </p>
      </section>

      {/* キャッチフレーズ & ビジョン */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>キャッチフレーズ</Pill>
            <span className="text-xs text-gray-500">
              投稿数 {counts.catchphrase}
            </span>
          </div>
          {topCatch ? (
            <div>
              <h3 className="mb-1 font-semibold">
                <Link
                  href={`/posts/${topCatch.id}`}
                  className="hover:underline"
                >
                  {topCatch.title}
                </Link>
              </h3>
              <p className="text-sm text-gray-600">
                {topCatch.content?.slice(0, 120)}
              </p>
            </div>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="gray">ビジョン（上位3つ）</Pill>
            <span className="text-xs text-gray-500">
              投稿数 {counts.vision}
            </span>
          </div>
          {topVis.length ? (
            <ol className="list-decimal pl-5 text-sm">
              {topVis.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link href={`/posts/${v.id}`} className="hover:underline">
                    {v.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
        </Card>
      </section>

      {/* 100いいね提案 & 実現提案 */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="gold">いいね100提案</Pill>
            <span className="text-xs text-gray-500">
              件数 {hundredLikeCount}
            </span>
          </div>
          <Link
            href="/posts?type=PROPOSAL&minLikes=100"
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 inline-block"
          >
            提案一覧へ
          </Link>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="green">実現提案</Pill>
            <span className="text-xs text-gray-500">
              件数 {realizedCount}
            </span>
          </div>
          <Link
            href="/posts?type=PROPOSAL&status=REALIZED"
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 inline-block"
          >
            実現一覧へ
          </Link>
        </Card>
      </section>

      {/* 自治体ランキング */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <Pill color="green">自治体別 投稿数ランキング（直近7日）</Pill>
          <Link href="/m" className="text-sm text-blue-600 hover:underline">
            自治体一覧を見る →
          </Link>
        </div>
        {topMunicipalities.length ? (
          <ol className="list-decimal pl-5 text-sm">
            {topMunicipalities.map((m) => (
              <li key={m.id} className="mb-1">
                <Link href={`/m/${m.slug}`} className="hover:underline">
                  {m.name}
                </Link>{" "}
                — {m.count} 件
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm">直近7日間の投稿はまだありません。</p>
        )}
      </section>

      {/* タグランキング & 本サイトについて */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2">
            <Pill color="green">タグランキング（TOP5）</Pill>
          </div>
          <ul className="flex flex-wrap gap-2">
            {topTags.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tags/${encodeURIComponent(t.name)}`}
                  className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                >
                  {t.name}（{t.count}）
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-2">
            <Pill color="gray">本サイトについて</Pill>
          </div>
          <p className="text-sm text-gray-700">
            全国の自治体ごとに
            <strong>キャッチフレーズ / ビジョン / 相談 / 提案</strong>
            を投稿し、いいねで可視化・実現を後押しするためのコミュニティサイトです。
          </p>
        </Card>
      </section>
    </>
  );
}