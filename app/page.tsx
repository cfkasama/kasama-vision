// app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Pill, Chip } from "@/components/ui";
import IntentButtons from "@/components/IntentButtons";

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
  const map = Object.fromEntries(rows.map(r => [r.type, r._count._all]));
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

// Intent（住みたい/働きたい/行きたい）の押下回数を AdminLog から集計（なければ 0）
async function getIntentCounts() {
  const actions = ["INTENT_LIVE", "INTENT_WORK", "INTENT_TOURISM"] as const;
  const rows = await prisma.adminLog.groupBy({
    by: ["action"],
    where: { action: { in: actions as unknown as string[] } },
    _count: { _all: true },
  });
  const map = Object.fromEntries(rows.map(r => [r.action, r._count._all]));
  return {
    live: (map["INTENT_LIVE"] ?? 0) as number,
    work: (map["INTENT_WORK"] ?? 0) as number,
    tourism: (map["INTENT_TOURISM"] ?? 0) as number,
  };
}

// タグランキング：TagTop5 優先、無ければ PostTag から集計
async function getTopTags() {
  try {
    const top = await prisma.tagTop5.findMany({ orderBy: { count: "desc" }, take: 5 });
    if (top.length) return top.map(t => ({ id: t.id, name: t.tagName, count: t.count }));
  } catch {}
  const grouped = await prisma.postTag.groupBy({
    by: ["tagId"],
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 5,
  });
  const tags = await prisma.tag.findMany({ where: { id: { in: grouped.map(g => g.tagId) } } });
  return grouped.map(g => ({
    id: g.tagId,
    name: tags.find(t => t.id === g.tagId)?.name ?? "",
    count: g._count.tagId,
  }));
}

export default async function Home() {
  const [
    counts,
    topCatch,
    topVis,
    hundredLikeCount,
    realizedCount,
    intent,
    topTags,
  ] = await Promise.all([
    countsByType(),
    getTopCatchphrase(),
    getTopVisions(),
    getHundredLikeProposalsCount(),
    getRealizedProposalsCount(),
    getIntentCounts(),
    getTopTags(),
  ]);

  return (
    <>
      <section className="mb-6">
        <h1 className="text-2xl font-bold">みんなで創る、笠間の未来</h1>
        <p className="text-sm text-gray-600">匿名で投稿、いいね/推薦で可視化、実現へ。</p>
      </section>

      {/* キャッチフレーズ & ビジョン */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>キャッチフレーズ</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.catchphrase}</span>
          </div>
          {topCatch ? (
            <div>
              <h3 className="mb-1 font-semibold">
                <Link href={`/posts/${topCatch.id}`} className="hover:underline">
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
            <Link href="/posts?type=CATCHPHRASE" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              一覧を見る
            </Link>
            <Link href="/new?type=CATCHPHRASE" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
              投稿する
            </Link>
          </div>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="gray">ビジョン（上位3つ）</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.vision}</span>
          </div>
          {topVis.length ? (
            <ol className="list-decimal pl-5 text-sm">
              {topVis.map((v) => (
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
          <div className="mt-3 flex gap-2">
            <Link href="/posts?type=VISION" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              一覧を見る
            </Link>
            <Link href="/new?type=VISION" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
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
          <div className="mt-1 flex gap-2">
            <Link href="/posts?type=CONSULTATION" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              一覧を見る
            </Link>
            <Link href="/new?type=CONSULTATION" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
              投稿する
            </Link>
          </div>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>提案</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.proposal}</span>
          </div>
          <div className="mt-1 flex gap-2">
            <Link href="/posts?type=PROPOSAL" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              一覧を見る
            </Link>
            <Link href="/new?type=PROPOSAL" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
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
            <span className="text-xs text-gray-500">件数 {hundredLikeCount}</span>
          </div>
          <Link href="/posts?type=PROPOSAL&minLikes=100" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 inline-block">
            提案一覧へ
          </Link>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="green">実現提案</Pill>
            <span className="text-xs text-gray-500">件数 {realizedCount}</span>
          </div>
          <Link href="/posts?type=PROPOSAL&status=REALIZED" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 inline-block">
            実現一覧へ
          </Link>
        </Card>
      </section>
<IntentButtons initial={intent} />
      {/* Intent ボタン行 */}

      {/* タグランキング & 本サイトについて */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2"><Pill color="green">タグランキング（TOP5）</Pill></div>
          <ul className="flex flex-wrap gap-2">
            {topTags.map((t) => (
              <li key={t.id}>
                <Link href={`/tags/${encodeURIComponent(t.name)}`} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {t.name}（{t.count}）
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-2"><Pill color="gray">本サイトについて</Pill></div>
          <p className="text-sm text-gray-700">
            「みんなで考える笠間の未来」は、匿名で
            <strong>キャッチフレーズ / ビジョン / 相談 / 提案</strong>を投稿し、
            いいねや推薦で可視化・実現を後押しするためのコミュニティサイトです。
          </p>
        </Card>
      </section>
    </>
  );
}
