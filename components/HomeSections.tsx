// components/HomeSections.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Pill } from "@/components/ui";
import IntentButtons from "@/components/IntentButtons";

type Scope = "GLOBAL" | "MUNI";
type PostType =
  | "CATCHPHRASE" | "VISION" | "CONSULTATION" | "PROPOSAL"
  | "REPORT_LIVE" | "REPORT_WORK" | "REPORT_TOURISM";

type Muni = { id: string; slug: string; name: string; prefecture: string | null };

function listUrlBase(scope: Scope, muni?: Muni) {
  return scope === "MUNI" && muni ? `/m/${muni.slug}/posts` : "/posts";
}
function newUrlBase(scope: Scope, muni?: Muni) {
  return scope === "MUNI" && muni ? `/m/${muni.slug}/new` : "/new";
}
function buildQuery(base: string, q: Record<string, string | number | undefined>) {
  const s =
    Object.entries(q)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
  return s ? `${base}?${s}` : base;
}
const whereScope = (scope: Scope, muni?: Muni) =>
  scope === "MUNI" && muni ? { municipalityId: muni.id } : {};

// 直近1週間の自治体ランキング（投稿数）
async function getTopMunicipalitiesWeekly(scope: Scope, muni?: Muni, limit = 10, days = 7) {
  if (scope !== "GLOBAL") return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.post.groupBy({
    by: ["municipalityId"],
    where: { status: "PUBLISHED", createdAt: { gte: since }, ...whereScope(scope, muni) },
    _count: { _all: true },
  });
  const topRows = rows
    .filter(r => !!r.municipalityId)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, limit);
  const ids = topRows.map(r => r.municipalityId!);
  if (!ids.length) return [];
  const municipalities = await prisma.municipality.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true },
  });
  return topRows.map(r => {
    const m = municipalities.find(mm => mm.id === r.municipalityId);
    return m ? { id: m.id, name: m.name, slug: m.slug, count: r._count._all } : null;
  }).filter(Boolean) as { id: string; name: string; slug: string; count: number }[];
}

async function countsByType(scope: Scope, muni?: Muni) {
  const rows = await prisma.post.groupBy({
    by: ["type"],
    where: { status: "PUBLISHED", ...whereScope(scope, muni) },
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

// ★ GLOBAL で自治体名を出したいので municipality を include しておく
const commonInclude = { municipality: { select: { slug: true, name: true } } } as const;

const getTopCatchphrase = (scope: Scope, muni?: Muni) =>
  prisma.post.findFirst({
    where: { status: "PUBLISHED", type: "CATCHPHRASE", ...whereScope(scope, muni) },
    orderBy: { likeCount: "desc" },
    include: commonInclude,
  });

const getTopVisions = (scope: Scope, muni?: Muni) =>
  prisma.post.findMany({
    where: { status: "PUBLISHED", type: "VISION", ...whereScope(scope, muni) },
    orderBy: { likeCount: "desc" },
    take: 3,
    include: commonInclude,
  });

const getNewConsultations = (scope: Scope, muni?: Muni) =>
  prisma.post.findMany({
    where: { status: "PUBLISHED", type: "CONSULTATION", ...whereScope(scope, muni) },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: commonInclude,
  });

const getNewProposals = (scope: Scope, muni?: Muni) =>
  prisma.post.findMany({
    where: { status: "PUBLISHED", type: "PROPOSAL", ...whereScope(scope, muni) },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: commonInclude,
  });

const getHundredLikeProposals = (scope: Scope, muni?: Muni) =>
  prisma.post.findMany({
    where: { status: "PUBLISHED", type: "PROPOSAL", likeCount: { gte: 100 }, ...whereScope(scope, muni) },
    orderBy: { likeCount: "desc" },
    take: 3,
    include: commonInclude,
  });

const getRealizedProposals = (scope: Scope, muni?: Muni) =>
  prisma.post.findMany({
    where: { status: "REALIZED", type: "PROPOSAL", ...whereScope(scope, muni) },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: commonInclude,
  });

const getChallengeProposals = (scope: Scope, muni?: Muni) =>
  prisma.post.findMany({
    where: { status: "CHALLENGE", type: "PROPOSAL", ...whereScope(scope, muni) },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: commonInclude,
  });

const countHundredLikes = (scope: Scope, muni?: Muni) =>
  prisma.post.count({
    where: { status: "PUBLISHED", type: "PROPOSAL", likeCount: { gte: 100 }, ...whereScope(scope, muni) },
  });

const countRealized = (scope: Scope, muni?: Muni) =>
  prisma.post.count({
    where: { status: "REALIZED", type: "PROPOSAL", ...whereScope(scope, muni) },
  });

const countChallenge = (scope: Scope, muni?: Muni) =>
  prisma.post.count({
    where: { status: "CHALLENGE", type: "PROPOSAL", ...whereScope(scope, muni) },
  });

async function getTopTags(scope: Scope, muni?: Muni) {
  const grouped = await prisma.postTag.groupBy({
    by: ["tagId"],
    where: { post: { status: "PUBLISHED", ...(whereScope(scope, muni)) } },
    _count: { tagId: true },
    orderBy: { _count: { tagId: "desc" } },
    take: 5,
  });
  if (!grouped.length) return [];
  const tags = await prisma.tag.findMany({ where: { id: { in: grouped.map(g => g.tagId) } } });
  return grouped.map(g => ({ id: g.tagId, name: tags.find(t => t.id === g.tagId)?.name ?? "", count: g._count.tagId }));
}

async function getIntentCounts(scope: Scope, muni?: Muni) {
  const rows = await prisma.intent.groupBy({
    by: ["kind"],
    where: { ...whereScope(scope, muni) },
    _count: { _all: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.kind, r._count._all]));
  return {
    live: (map["LIVE"] ?? 0) as number,
    work: (map["WORK"] ?? 0) as number,
    tourism: (map["TOURISM"] ?? 0) as number,
  };
}

// タイトル行の後ろに自治体バッジを付ける共通UI
function MuniBadge({ slug, name }: { slug?: string; name?: string }) {
  if (!slug || !name) return null;
  return (
    <Link
      href={`/m/${slug}`}
      className="ml-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px]"
    >
      {name}
    </Link>
  );
}

export default async function HomeSections({ scope, muni }: { scope: Scope; muni?: Muni }) {
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
    topMunicipalities,   // ★ GLOBAL だけ中身が入る
  ] = await Promise.all([
    countsByType(scope, muni),
    getTopCatchphrase(scope, muni),
    getTopVisions(scope, muni),
    getNewConsultations(scope, muni),
    getNewProposals(scope, muni),
    getHundredLikeProposals(scope, muni),
    getRealizedProposals(scope, muni),
    getChallengeProposals(scope, muni),
    countHundredLikes(scope, muni),
    countRealized(scope, muni),
    countChallenge(scope, muni),
    getIntentCounts(scope, muni),
    getTopTags(scope, muni),
    getTopMunicipalitiesWeekly(scope, muni, 10, 7),
  ]);

  const listBase = listUrlBase(scope, muni);
  const newBase = newUrlBase(scope, muni);

  return (
    <>
      {/* 見出し */}
      <section className="mb-6">
        <h1 className="text-2xl font-bold">
          {scope === "MUNI"
            ? `${muni?.prefecture ? `${muni?.prefecture} ` : ""}${muni?.name} の投稿`
            : "みんなで創る、自治体の未来"}
        </h1>
        <p className="text-sm text-gray-600">匿名で投稿、いいねで可視化、実現へ。</p>

        {scope === "MUNI" ? (
          <div className="mt-3">
            <Link href="/m" className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
              ← 自治体一覧へ
            </Link>
          </div>
        ) : null}
      </section>

      {/* ★ GLOBAL限定：自治体別 直近7日ランキング */}
      {scope === "GLOBAL" && (
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
                      <Link href={`/m/${m.slug}`} className="hover:underline">{m.name}</Link> — {m.count} 件
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm">直近7日間の投稿はまだありません。</p>
              )}
            </div>
            <Link
              href="/m"
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 inline-block mt-2"
            >
              自治体一覧へ
            </Link>
          </Card>
        </section>
      )}

      {/* キャッチフレーズ / ビジョン */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>キャッチフレーズ</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.catchphrase}</span>
          </div>
          {topCatch ? (
            <h3 className="mb-1 font-semibold">
              <Link href={`${listBase}/${topCatch.id}`} className="hover:underline">
                {topCatch.title}
              </Link>
              {scope === "GLOBAL" && (
                <MuniBadge slug={topCatch.municipality?.slug} name={topCatch.municipality?.name} />
              )}
            </h3>
          ) : <p className="text-sm">まだありません。</p>}
          <div className="mt-3 flex gap-2">
            <Link href={buildQuery(listBase, { type: "CATCHPHRASE" })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">一覧を見る</Link>
            <Link href={`${newBase}?type=CATCHPHRASE`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">投稿する</Link>
          </div>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="gray">ビジョン（上位3つ）</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.vision}</span>
          </div>
          {topVis.length ? (
            <ol className="list-decimal pl-5 text-sm">
              {topVis.map(v => (
                <li key={v.id} className="mb-1">
                  <Link href={`${listBase}/${v.id}`} className="hover:underline">{v.title}</Link>
                  {scope === "GLOBAL" && (
                    <MuniBadge slug={v.municipality?.slug} name={v.municipality?.name} />
                  )}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm">まだありません。</p>}
          <div className="mt-3 flex gap-2">
            <Link href={buildQuery(listBase, { type: "VISION" })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">一覧を見る</Link>
            <Link href={`${newBase}?type=VISION`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">投稿する</Link>
          </div>
        </Card>
      </section>

      {/* 相談 / 提案 */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>相談</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.consultation}</span>
          </div>
          {newCons.length ? (
            <ol className="list-disc pl-5 text-sm">
              {newCons.map(v => (
                <li key={v.id} className="mb-1">
                  <Link href={`${listBase}/${v.id}`} className="hover:underline">{v.title}</Link>
                  {scope === "GLOBAL" && (
                    <MuniBadge slug={v.municipality?.slug} name={v.municipality?.name} />
                  )}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm">まだありません。</p>}
          <div className="mt-1 flex gap-2">
            <Link href={buildQuery(listBase, { type: "CONSULTATION" })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">一覧を見る</Link>
            <Link href={`${newBase}?type=CONSULTATION`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">投稿する</Link>
          </div>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill>提案</Pill>
            <span className="text-xs text-gray-500">投稿数 {counts.proposal}</span>
          </div>
          {newPros.length ? (
            <ol className="list-disc pl-5 text-sm">
              {newPros.map(v => (
                <li key={v.id} className="mb-1">
                  <Link href={`${listBase}/${v.id}`} className="hover:underline">{v.title}</Link>
                  {scope === "GLOBAL" && (
                    <MuniBadge slug={v.municipality?.slug} name={v.municipality?.name} />
                  )}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm">まだありません。</p>}
          <div className="mt-1 flex gap-2">
            <Link href={buildQuery(listBase, { type: "PROPOSAL" })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">一覧を見る</Link>
            <Link href={`${newBase}?type=PROPOSAL`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">投稿する</Link>
          </div>
        </Card>
      </section>

      {/* 100いいね / 実現 / 挑戦中 */}
      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="gold">いいね100提案</Pill>
            <span className="text-xs text-gray-500">件数 {hundredLikeCount}</span>
          </div>
          {hundredLikes.length ? (
            <ol className="list-disc pl-5 text-sm">
              {hundredLikes.map(v => (
                <li key={v.id} className="mb-1">
                  <Link href={`${listBase}/${v.id}`} className="hover:underline">{v.title}</Link>
                  {scope === "GLOBAL" && (
                    <MuniBadge slug={v.municipality?.slug} name={v.municipality?.name} />
                  )}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm">まだありません。</p>}
          <Link href={buildQuery(listBase, { type: "PROPOSAL", minLikes: 100 })} className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">提案一覧へ</Link>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="green">実現提案</Pill>
            <span className="text-xs text-gray-500">件数 {realizedCount}</span>
          </div>
          {realizeds.length ? (
            <ol className="list-disc pl-5 text-sm">
              {realizeds.map(v => (
                <li key={v.id} className="mb-1">
                  <Link href={`${listBase}/${v.id}`} className="hover:underline">{v.title}</Link>
                  {scope === "GLOBAL" && (
                    <MuniBadge slug={v.municipality?.slug} name={v.municipality?.name} />
                  )}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm">まだありません。</p>}
          <Link href={buildQuery(listBase, { type: "PROPOSAL", status: "REALIZED" })} className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">実現一覧へ</Link>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Pill color="gold">挑戦中提案</Pill>
            <span className="text-xs text-gray-500">件数 {challengeCount}</span>
          </div>
          {challenge.length ? (
            <ol className="list-disc pl-5 text-sm">
              {challenge.map(v => (
                <li key={v.id} className="mb-1">
                  <Link href={`${listBase}/${v.id}`} className="hover:underline">{v.title}</Link>
                  {scope === "GLOBAL" && (
                    <MuniBadge slug={v.municipality?.slug} name={v.municipality?.name} />
                  )}
                </li>
              ))}
            </ol>
          ) : <p className="text-sm">まだありません。</p>}
          <Link href={buildQuery(listBase, { type: "PROPOSAL", status: "CHALLENGE" })} className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">挑戦中一覧へ</Link>
        </Card>
      </section>
      
      {scope === "MUNI" && muni?.slug !== "site" ? (
        <section className="mt-4 grid gap-4">
          <IntentButtons initial={intent} mname={muni?.name} mslug={muni?.slug} />
        </section>
      ) : null}
      
      {/* タグ TOP5 */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2"><Pill color="green">タグランキング（TOP5）</Pill></div>
          <ul className="flex flex-wrap gap-2">
            {topTags.map(t => (
              <li key={t.id}>
                <Link
                  href={scope === "MUNI"
                    ? `/m/${muni!.slug}/tags/${encodeURIComponent(t.name)}`
                    : `/tags/${encodeURIComponent(t.name)}`
                  }
                  className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                >
                  {t.name}（{t.count}）
                </Link>
              </li>
            ))}
            {topTags.length === 0 && <li className="text-sm text-gray-600">データがありません</li>}
          </ul>
          <Link
            href={scope === "MUNI" ? `/m/${muni!.slug}/tags` : `/tags`}
            className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            タグ一覧へ
          </Link>
        </Card>

        <Card>
          <div className="mb-2"><Pill color="gray">{scope === "MUNI" ? "このページについて" : "本サイトについて"}</Pill></div>
          <p className="text-sm text-gray-700">
            「みんなで考える未来」は、匿名で<strong>キャッチフレーズ / ビジョン / 相談 / 提案</strong>を投稿し、
            いいねで可視化・実現を後押しするコミュニティサイトです。
            {scope === "MUNI" && <> ここでは「{(muni?.prefecture ? `${muni?.prefecture} ` : "") + (muni?.name ?? "")}」に関する投稿や相談ができます。</>}
          </p>
        </Card>
      </section>
    </>
  );
}
