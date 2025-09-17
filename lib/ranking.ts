// lib/ranking.ts
import { prisma } from "@/lib/db";
import { unstable_cache as cache } from "next/cache";
import { getJstMonthRange } from "@/lib/time";

export type Metric = "live" | "work" | "tourism";

function kindOf(metric: Metric) {
  return metric === "live" ? "LIVE"
       : metric === "work" ? "WORK"
       : "TOURISM";
}

/** 生の取得（キャッシュ前）: 今月（JST）のランキング */
async function getIntentRankingMonthlyRaw(metric: Metric, limit = 3) {
  const { start, next } = getJstMonthRange();
  const K = kindOf(metric);

  // 1) intent を自治体ごとに集計（今月のみ）
  const grouped = await prisma.intent.groupBy({
    by: ["municipalityId"],
    where: { kind: K as any, createdAt: { gte: start, lt: next } },
    _count: { _all: true },
    // _all は orderBy に使えないので municipalityId の件数で並び替え
    orderBy: { _count: { municipalityId: "desc" } },
    take: limit * 2, // タイブレーク用に少し多め
  });

  if (!grouped.length) return [];

  // 2) 自治体メタ（name/slug/code）を取得
  const ids = grouped.map((g) => g.municipalityId);
  const munis = await prisma.municipality.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true, code: true },
  });
  const byId = new Map(munis.map((m) => [m.id, m]));

  // 3) マージ → ソート（count desc, code asc） → 上位 limit
  const merged = grouped.map((g) => ({
    id: g.municipalityId,
    name: byId.get(g.municipalityId)?.name ?? "",
    slug: byId.get(g.municipalityId)?.slug ?? "",
    code: byId.get(g.municipalityId)?.code ?? "",
    count: g._count._all,
  }));

  merged.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const ac = a.code ?? "";
    const bc = b.code ?? "";
    return ac < bc ? -1 : ac > bc ? 1 : 0;
  });

  // UI 形に整形して返す
  return merged.slice(0, limit).map(({ code, ...rest }) => rest);
}

/**
 * 今月（JST）のランキング取得：60秒キャッシュ + タグ失効対応
 * 失効タグ: ranking:monthly:<metric>
 */
export async function getIntentRankingMonthly(metric: Metric, limit = 3) {
  const key = [`ranking:monthly:${metric}:${limit}`];
  const tags = [`ranking:monthly:${metric}`];
  return cache(
    () => getIntentRankingMonthlyRaw(metric, limit),
    key,
    { revalidate: 60, tags }
  )();
}