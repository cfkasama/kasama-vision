// lib/ranking.ts
import { prisma } from "@/lib/db";
import { getJstMonthRange } from "@/lib/time";

function kindOf(metric: Metric) {
  return metric === "live" ? "LIVE" : metric === "work" ? "WORK" : "TOURISM";
}

// 共通型（他ファイルと齟齬が出ないよう統一）
export const METRICS = ["live", "work", "tourism"] as const;
export type Metric = typeof METRICS[number];
export type Range = "total" | "monthly";

// metric × range → カラム名
function pickField(metric: Metric, range: Range) {
  if (range === "total") {
    return metric === "live"
      ? "liveCount"
      : metric === "work"
      ? "workCount"
      : "tourismCount";
  }
  return metric === "live"
    ? "liveCountMonthly"
    : metric === "work"
    ? "workCountMonthly"
    : "tourismCountMonthly";
}

/** 今月（JST）のランキング：{id,name,slug,count}[] を返す */
export async function getIntentRankingMonthly(metric: Metric, limit = 3) {
  const { start, next } = getJstMonthRange();
  const K = kindOf(metric);

  // 1) intent を自治体ごとに集計（今月のみ）
  const grouped = await prisma.intent.groupBy({
    by: ["municipalityId"],
    where: { kind: K as any, createdAt: { gte: start, lt: next } },
    _count: { _all: true },
    orderBy: { _count: { municipalityId: "desc" } },
    take: limit * 2, // タイブレーク用に少し多めに取っておくと安心
  });

  if (!grouped.length) return [];

  // 2) 自治体メタ（name/slug/code）を取得
  const ids = grouped.map(g => g.municipalityId);
  const munis = await prisma.municipality.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true, code: true },
  });
  const byId = new Map(munis.map(m => [m.id, m]));

  // 3) マージ＆ソート（count desc, code asc）＆上位limit
  const merged = grouped.map(g => ({
    id: g.municipalityId,
    name: byId.get(g.municipalityId)?.name ?? "",
    slug: byId.get(g.municipalityId)?.slug ?? "",
    code: byId.get(g.municipalityId)?.code ?? "",
    count: g._count._all,
  }));

  merged.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count; // 降順
    const ac = a.code ?? "";
    const bc = b.code ?? "";
    return ac < bc ? -1 : ac > bc ? 1 : 0; // 同数なら code 昇順
  });

  return merged.slice(0, limit).map(({ code, ...rest }) => rest); // UI shape
}

export async function fetchMunicipalityRanking(
  metric: Metric,
  range: Range,
  limit = 100
) {
  const field = pickField(metric, range);

  return prisma.municipality.findMany({
    select: { id: true, name: true, slug: true, code: true, 
      liveCount: true, workCount: true, tourismCount: true,
      liveCountMonthly: true, workCountMonthly: true, tourismCountMonthly: true,
    },
    orderBy: [
      // 主要ソート（降順）
      { [field]: "desc" as const },
      // タイブレーク：投稿数（全タイプ総数）や code を使う
      // ここは code を優先と要望されてたので code 昇順を第2キーに
      { code: "asc" as const },
    ],
    take: limit,
  });
}
