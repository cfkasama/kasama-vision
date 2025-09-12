// app/m/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, Pill } from "@/components/ui";
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

// 集計：タイプ別件数
async function countsByType(muniId: string) {
  const rows = await prisma.post.groupBy({
    by: ["type"],
    where: { status: "PUBLISHED", municipalityId: muniId },
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

async function getTopCatchphrase(muniId: string) {
  return prisma.post.findFirst({
    where: { status: "PUBLISHED", type: "CATCHPHRASE", municipalityId: muniId },
    orderBy: { likeCount: "desc" },
  });
}

async function getTopVisions(muniId: string) {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "VISION", municipalityId: muniId },
    orderBy: { likeCount: "desc" },
    take: 3,
  });
}

async function getNewConsultations(muniId: string) {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "CONSULTATION", municipalityId: muniId },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getNewProposals(muniId: string) {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "PROPOSAL", municipalityId: muniId },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getHundredLikeProposals(muniId: string) {
  return prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      type: "PROPOSAL",
      municipalityId: muniId,
      likeCount: { gte: 100 },
    },
    orderBy: { likeCount: "desc" },
    take: 3,
  });
}

async function getRealizedProposals(muniId: string) {
  return prisma.post.findMany({
    where: { status: "REALIZED", type: "PROPOSAL", municipalityId: muniId },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getChallengeProposals(muniId: string) {
  return prisma.post.findMany({
    where: { status: "CHALLENGE", type: "PROPOSAL", municipalityId: muniId },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getHundredLikeProposalsCount(muniId: string) {
  return prisma.post.count({
    where: {
      status: "PUBLISHED",
      type: "PROPOSAL",
      municipalityId: muniId,
      likeCount: { gte: 100 },
    },
  });
}

async function getChallengeProposalsCount(muniId: string) {
  return prisma.post.count({
    where: { status: "CHALLENGE", type: "PROPOSAL", municipalityId: muniId },
  });
}

async function getRealizedProposalsCount(muniId: string) {
  return prisma.post.count({
    where: { status: "REALIZED", type: "PROPOSAL", municipalityId: muniId },
  });
}

async function getIntentCounts(muniId: string) {
  const rows = await prisma.intent.groupBy({
    by: ["kind"],
    where: { municipalityId: muniId },
    _count: { _all: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.kind, r._count._all]));
  return {
    live: (map["LIVE"] ?? 0) as number,
    work: (map["WORK"] ?? 0) as number,
    tourism: (map["TOURISM"] ?? 0) as number,
  };
}

// タグTOP5（PostTag から自治体別集計）
async function getTopTags(muniId: string) {
  const grouped = await prisma.postTag.groupBy({
    by: ["tagId"],
    where: { post: { status: "PUBLISHED", municipalityId: muniId } },
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 5,
  });
  if (grouped.length === 0) return [];
  const tags = await prisma.tag.findMany({
    where: { id: { in: grouped.map((g) => g.tagId) } },
  });
  return grouped.map((g) => ({
    id: g.tagId,
    name: tags.find((t) => t.id === g.tagId)?.name ?? "",
    count: g._count.tagId,
  }));
}

export default async function MunicipalityPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const muni = await prisma.municipality.findUnique({
    where: { slug },
    select: { id: true, name: true, prefecture: true, slug: true },
  });
  if (!muni) notFound();

  const mId = muni.id;

  const [
    counts,
    topCatch,
    topVis,
    newCons,
    newPros,
    hundredLikes,
    realizeds,
    challenge,
    hundredLikeCount,
    realizedCount,
    challengeCount,
    intent,
    topTags,
  ] = await Promise.all([
    countsByType(mId),
    getTopCatchphrase(mId),
    getTopVisions(mId),
    getNewConsultations(mId),
    getNewProposals(mId),
    getHundredLikeProposals(mId),
    getRealizedProposals(mId),
    getChallengeProposals(mId),
    getHundredLikeProposalsCount(mId),
    getRealizedProposalsCount(mId),
    getChallengeProposalsCount(mId),
    getIntentCounts(mId),
    getTopTags(mId),
  ]);

  // /m/[slug]/posts に渡すクエリ（一覧へリンク用）
  const listUrl = (q: Record<string, string | number | undefined>) =>
    `/m/${slug}/posts` +
    "?" +
    Object.entries(q)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");

  return (
    <>
      <section className="mb-6">
        <h1 className="text-2xl font-bold">
          {(muni.prefecture ? `${muni.prefecture} ` : "") + muni.name} の投稿
        </h1>
        <p className="text-sm text-gray-600">
          自治体別ページです。匿名で投稿、いいねで可視化、実現へ。
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/m"
            className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← 自治体一覧へ
          </Link>
        </div>
      </section>

      {/* キャッチフレーズ / ビジョン */}
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
                  href={`/m/${slug}/posts/${topCatch.id}`}
                  className="hover:underline"
                >
                  {topCatch.title}
                </Link>
              </h3>
            </div>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <div className="mt-3 flex gap-2">
            <Link
              href={listUrl({ type: "CATCHPHRASE" })}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              一覧を見る
            </Link>
            <Link
              href={`/m/${slug}/new?type=CATCHPHRASE`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
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
                  <Link
                    href={`/m/${slug}/posts/${v.id}`}
                    className="hover:underline"
                  >
                    {v.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <div className="mt-3 flex gap-2">
            <Link
              href={listUrl({ type: "VISION" })}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              一覧を見る
            </Link>
            <Link
              href={`/m/${slug}/new?type=VISION`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              投稿する
            </Link>
          </div>
        </Card>
      </section>

      {/* 相談 / 提案 */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>相談</Pill>
            <span className="text-xs text-gray-500">
              投稿数 {counts.consultation}
            </span>
          </div>
          {newCons.length ? (
            <ol className="list-disc pl-5 text-sm">
              {newCons.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link
                    href={`/m/${slug}/posts/${v.id}`}
                    className="hover:underline"
                  >
                    {v.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <div className="mt-1 flex gap-2">
            <Link
              href={listUrl({ type: "CONSULTATION" })}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              一覧を見る
            </Link>
            <Link
              href={`/m/${slug}/new?type=CONSULTATION`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              投稿する
            </Link>
          </div>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>提案</Pill>
            <span className="text-xs text-gray-500">
              投稿数 {counts.proposal}
            </span>
          </div>
          {newPros.length ? (
            <ol className="list-disc pl-5 text-sm">
              {newPros.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link
                    href={`/m/${slug}/posts/${v.id}`}
                    className="hover:underline"
                  >
                    {v.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <div className="mt-1 flex gap-2">
            <Link
              href={listUrl({ type: "PROPOSAL" })}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              一覧を見る
            </Link>
            <Link
              href={`/m/${slug}/new?type=PROPOSAL`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              投稿する
            </Link>
          </div>
        </Card>
      </section>

      {/* 100いいね / 実現 */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="gold">いいね100提案</Pill>
            <span className="text-xs text-gray-500">件数 {hundredLikeCount}</span>
          </div>
          {hundredLikes.length ? (
            <ol className="list-disc pl-5 text-sm">
              {hundredLikes.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link
                    href={`/m/${slug}/posts/${v.id}`}
                    className="hover:underline"
                  >
                    {v.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <Link
            href={listUrl({ type: "PROPOSAL", minLikes: 100 })}
            className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            提案一覧へ
          </Link>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="green">実現提案</Pill>
            <span className="text-xs text-gray-500">件数 {realizedCount}</span>
          </div>
          {realizeds.length ? (
            <ol className="list-disc pl-5 text-sm">
              {realizeds.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link
                    href={`/m/${slug}/posts/${v.id}`}
                    className="hover:underline"
                  >
                    {v.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <Link
            href={listUrl({ type: "PROPOSAL", status: "REALIZED" })}
            className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            実現一覧へ
          </Link>
        </Card>
        </section>
              <section className="mt-4 grid gap-4 md:grid-cols-2">
                <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="gold">挑戦中提案</Pill>
            <span className="text-xs text-gray-500">件数 {challengeCount}</span>
          </div>
          {challenge.length ? (
            <ol className="list-disc pl-5 text-sm">
              {challenge.map((v) => (
                <li key={v.id} className="mb-1">
                  <Link
                    href={`/m/${slug}/posts/${v.id}`}
                    className="hover:underline"
                  >
                    {v.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <Link
            href={listUrl({ type: "PROPOSAL", status: "CHALLENGE" })}
            className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            挑戦中一覧へ
          </Link>
        </Card>
                <Card>
          <div className="mb-2">
            <Pill color="green">タグランキング（TOP5）</Pill>
          </div>
          <ul className="flex flex-wrap gap-2">
            {topTags.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/m/${slug}/tags/${encodeURIComponent(t.name)}`}
                  className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                >
                  {t.name}（{t.count}）
                </Link>
              </li>
            ))}
            {topTags.length === 0 && (
              <li className="text-sm text-gray-600">データがありません</li>
            )}
          </ul>
          <Link
            href={`/m/${slug}/tags`}
            className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            タグ一覧へ
          </Link>
        </Card>
      </section>

      {/* INTENT（サイト全体ページでは非表示） */}
      {muni.slug !== "site" && (
        <section className="mt-4 grid gap-4">
          <IntentButtons initial={intent} mname={muni.name} mslug={muni.slug} />
        </section>
      )}

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-1">
            <Pill color="gray">このページについて</Pill>
          </div>
          <p className="text-sm text-gray-700">
            「みんなで考える未来」は、匿名で
            <strong>キャッチフレーズ / ビジョン / 相談 / 提案</strong>
            を投稿し、いいねで可視化・実現を後押しするコミュニティサイトです。
            ここでは「
            {(muni.prefecture ? `${muni.prefecture} ` : "") + muni.name}
            」に関する投稿や相談ができます。
          </p>
        </Card>
      </section>
    </>
  );
}
