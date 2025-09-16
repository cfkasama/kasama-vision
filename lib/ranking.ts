// lib/ranking.ts
import { prisma } from "@/lib/db";

export type Metric = "live" | "work" | "tourism";
export type Range = "total" | "monthly";

function pickField(metric: Metric, range: Range) {
  if (range === "total") {
    return metric === "live"
      ? "liveCount" : metric === "work"
      ? "workCount" : "tourismCount";
  }
  return metric === "live"
    ? "liveCountMonthly" : metric === "work"
    ? "workCountMonthly" : "tourismCountMonthly";
}

export async function getIntentRankingMonthly(
  kind: Metric,
  limit = 3
) {
  const field = pickField(metric, range);
  const getTopVisions = (scope: Scope, muni?: Muni) =>
  const rows = await prisma.municipality.findMany({
    orderBy: { field: "desc" },
    take: 3,
  });

  if (!rows.length) return [];
  return rows;
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
