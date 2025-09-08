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

async function getNewConsultations() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "CONSULTATION" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getNewProposals() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "PROPOSAL" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getHundredLikeProposals() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "PROPOSAL", likeCount: { gte: 100 } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getRealizedProposals() {
  return prisma.post.findMany({
    where: { status: "REALIZED", type: "PROPOSAL" },
    orderBy: { createdAt: "desc" },
    take: 3,
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

// 直近1週間の自治体ランキング（投稿数）
async function getTopMunicipalitiesWeekly(limit = 10, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // まずは全件 groupBy（DB ではソートしない）
  const rows = await prisma.post.groupBy({
    by: ["municipalityId"],
    where: {
      status: "PUBLISHED",
      createdAt: { gte: since },
    },
    _count: { _all: true },
  });

  // null を除外して件数で降順ソート → 上位だけ採用
  const topRows = rows
    .filter(r => !!r.municipalityId)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, limit);

  const ids = topRows.map(r => r.municipalityId!) ;

  if (ids.length === 0) return [];

  const municipalities = await prisma.municipality.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true },
  });

  // rows 順のまま名称を合成
  return topRows
    .map(r => {
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
    newCons,
    newPros,
    hundredLikes,
    realizeds,    
    hundredLikeCount,
    realizedCount,
    topTags,
    topMunicipalities,
  ] = await Promise.all([
    countsByType(),
    getTopCatchphrase(),
    getTopVisions(),
    getNewConsultations(),
    getNewProposals(),
    getHundredLikeProposals(),
    getRealizedProposals(),
    getHundredLikeProposalsCount(),
    getRealizedProposalsCount(),
    getTopTags(),
    getTopMunicipalitiesWeekly(10, 7),
  ]);

  return (
    <>
      <section className="mb-6">
        <h1 className="text-2xl font-bold">みんなで創る、自治体の未来</h1>
        <p className="text-sm text-gray-600">
          匿名で投稿、いいねで可視化、実現へ。
        </p>
      </section>

      {/* 自治体ランキング */}
      <section className="mt-6">
        <Card>
        <div className="mb-2 flex items-center justify-between">
          <Pill color="green">自治体別 投稿数ランキング（直近7日）</Pill>
        </div>
                      <div>
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
                                </div>
          <Link
            href="/m"
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 inline-block"
          >
            自治体一覧へ
          </Link>
        </Card>
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
         <div className="mt-3 flex gap-2">
            <Link href={baseQuery({ type: "CATCHPHRASE" })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              一覧を見る
            </Link>
            <Link
              href={`/new?type=CATCHPHRASE`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              投稿する
            </Link>
          </div>
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
                    <div className="mt-3 flex gap-2">
            <Link href={baseQuery({ type: "VISION" })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              一覧を見る
            </Link>
            <Link
              href={`/new?type=VISION`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              投稿する
            </Link>
          </div>
        </Card>
      </section>

       {/* 相談 & 提案 */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>相談</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.consultation}</span>
          </div>
           {newCons.length ? (
            <ol className="list-disc pl-5 text-sm">
              {newCons.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link href={`/posts/${v.id}`} className="hover:underline">
                    {v.title}
                  </Link>{" "}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <div className="mt-1 flex gap-2">
            <Link href={baseQuery({ type: "CONSULTATION" })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              一覧を見る
            </Link>
            <Link
              href={`/new?type=CONSULTATION`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              投稿する
            </Link>
          </div>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>提案</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.proposal}</span>
          </div>
          {newPros.length ? (
            <ol className="list-disc pl-5 text-sm">
              {newPros.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link href={`/posts/${v.id}`} className="hover:underline">
                    {v.title}
                  </Link>{" "}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <div className="mt-1 flex gap-2">
            <Link href={baseQuery({ type: "PROPOSAL" })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              一覧を見る
            </Link>
            <Link
              href={`/new?type=PROPOSAL`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              投稿する
            </Link>
          </div>
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
           {hundredLikes.length ? (
            <ol className="list-disc pl-5 text-sm">
              {hundredLikes.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link href={`/posts/${v.id}`} className="hover:underline">
                    {v.title}
                  </Link>{" "}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
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
          {realizeds.length ? (
            <ol className="list-disc pl-5 text-sm">
              {realizeds.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link href={`/posts/${v.id}`} className="hover:underline">
                    {v.title}
                  </Link>{" "}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <Link
            href="/posts?type=PROPOSAL&status=REALIZED"
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 inline-block"
          >
            実現一覧へ
          </Link>
        </Card>
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
          <Link href="/tags" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 inline-block">
            タグ一覧へ
          </Link>
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
