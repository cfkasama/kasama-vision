// app/m/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
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


const labelByType: Record<PostType, string> = {
  CATCHPHRASE: "キャッチフレーズ",
  VISION: "ビジョン",
  CONSULTATION: "相談",
  PROPOSAL: "提案",
  REPORT_LIVE: "住めなかった報告",
  REPORT_WORK: "働けなかった報告",
  REPORT_TOURISM: "不満がある報告",
};

async function countsByType(muniId: string) {
  const rows = await prisma.post.groupBy({
    by: ["type"],
    where: { status: "PUBLISHED", municipality: { id: muniId } },
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
    where: { status: "PUBLISHED", type: "CATCHPHRASE", municipality: { id: muniId } },
    orderBy: { likeCount: "desc" },
    include: { tags: { include: { tag: true } } },
  });
}

async function getTopVisions(muniId: string) {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "VISION", municipality: { id: muniId } },
    orderBy: { likeCount: "desc" },
    take: 3,
    include: { tags: { include: { tag: true } } },
  });
}

async function getNewConsultations(muniId: string) {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "CONSULTATION", municipality: { id: muniId } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getNewProposals(muniId: string) {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "PROPOSAL", municipality: { id: muniId } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getHundredLikeProposals(muniId: string) {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", type: "PROPOSAL", municipality: { id: muniId }, likeCount: { gte: 100 } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getRealizedProposals(muniId: string) {
  return prisma.post.findMany({
    where: { status: "REALIZED", type: "PROPOSAL", municipality: { id: muniId } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

async function getHundredLikeProposalsCount(muniId: string) {
  return prisma.post.count({
    where: { status: "PUBLISHED", type: "PROPOSAL", municipality: { id: muniId }, likeCount: { gte: 100 } },
  });
}
async function getRealizedProposalsCount(muniId: string) {
  return prisma.post.count({
    where: { status: "REALIZED", type: "PROPOSAL", municipality: { id: muniId } },
  });
}
async function getIntentCounts(muniId: string) {
  const rows = await prisma.intent.groupBy({
    by: ["kind"],
    where: { municipalityId: muniId }, // ← ここがポイント
    _count: { _all: true },
  });

  const map = Object.fromEntries(rows.map(r => [r.kind, r._count._all]));
  return {
    live: (map["LIVE"] ?? 0) as number,
    work: (map["WORK"] ?? 0) as number,
    tourism: (map["TOURISM"] ?? 0) as number,
  };
}

// タグTOP5（TagTop5が自治体別で無い想定なので PostTag から集計）
async function getTopTags(muniId: string) {
  const grouped = await prisma.postTag.groupBy({
    by: ["tagId"],
    where: { post: { status: "PUBLISHED", municipality: { id: muniId } } },
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 5,
  });
  if (grouped.length === 0) return [];
  const tags = await prisma.tag.findMany({ where: { id: { in: grouped.map((g) => g.tagId) } } });
  return grouped.map((g) => ({
    id: g.tagId,
    name: tags.find((t) => t.id === g.tagId)?.name ?? "",
    count: g._count.tagId,
  }));
}

export default async function MunicipalityPage({ params }: { params: { slug: string} }) {
  const slug = params.slug;

  const muni = await prisma.municipality.findUnique({
    where: { slug },
    select: { id: true, name: true, prefecture: true, slug: true },
  });
  if (!muni) notFound();

  const mId=muni.id;
  
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
    getHundredLikeProposalsCount(mId),
    getRealizedProposalsCount(mId),
    getIntentCounts(mId),
    getTopTags(mId),
  ]);
  
  const baseQuery = (q: Record<string, string | number | undefined>) =>
    "/posts?" +
    Object.entries({ municipality: slug, ...q })
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
          自治体別ページです。匿名で投稿、いいね/推薦で可視化、実現へ。
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href={`/m`}
            className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← 自治体一覧へ
          </Link>
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>キャッチフレーズ</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.catchphrase}</span>
          </div>
          {topCatch ? (
            <div>
              <h3 className="mb-1 font-semibold">
                <Link href={`./posts/${topCatch.id}`} className="hover:underline">
                  {topCatch.title}
                </Link>
              </h3>
            </div>
          ) : (
            <p className="text-sm">まだありません。</p>
          )}
          <div className="mt-3 flex gap-2">
            <Link href={baseQuery({ type: "CATCHPHRASE" })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              一覧を見る
            </Link>
            <Link
              href={`./new?type=CATCHPHRASE}`}
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
              href={`/new?type=VISION&municipality=${encodeURIComponent(slug)}`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              投稿する
            </Link>
          </div>
        </Card>
      </section>

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
              href={`/new?type=CONSULTATION&municipality=${encodeURIComponent(slug)}`}
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
              href={`/new?type=PROPOSAL&municipality=${encodeURIComponent(slug)}`}
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
            <span className="text-xs text-gray-500">件数 {hundredLikeCount}</span>
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
            href={baseQuery({ type: "PROPOSAL", minLikes: 100 })}
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
            href={baseQuery({ type: "PROPOSAL", status: "REALIZED" })}
            className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            実現一覧へ
          </Link>
        </Card>
      </section>
            <section className="mt-4 grid gap-4">
<IntentButtons initial={intent} mname={muni.name} mslug={muni.slug}/>
            </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2">
            <Pill color="green">タグランキング（TOP5）</Pill>
          </div>
          <ul className="flex flex-wrap gap-2">
            {topTags.map((t) => (
              <li key={t.id}>
                <Link
                  href={baseQuery({ tag: t.name })}
                  className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                >
                  {t.name}（{t.count}）
                </Link>
              </li>
            ))}
            {topTags.length === 0 && <li className="text-sm text-gray-600">データがありません</li>}
          </ul>
                    <Link href="/tags" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 inline-block">
            タグ一覧へ
          </Link>
        </Card>

        <Card>
          <div className="mb-2">
            <Pill color="gray">このページについて</Pill>
          </div>
          <p className="text-sm text-gray-700">
            「みんなで考える未来」は、匿名で
            <strong>キャッチフレーズ / ビジョン / 相談 / 提案</strong>を投稿し、
            いいねや推薦で可視化・実現を後押しするためのコミュニティサイトです。
            ここでは「{(muni.prefecture ? `${muni.prefecture} ` : "") + muni.name}」に関する投稿や相談ができます。
          </p>
        </Card>
      </section>
    </>
  );
}
