// lib/ranking.ts
import { prisma } from "@/lib/db";

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

/**
 * 月間ランキング: UI向け {id,name,slug,count} を返す
 */
export async function getIntentRankingMonthly(metric: Metric, limit = 3) {
  const field = pickField(metric, "monthly");

  const rows = await prisma.municipality.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      code: true, // 第2ソートに使うので残す
      liveCountMonthly: true,
      workCountMonthly: true,
      tourismCountMonthly: true,
    },
    orderBy: [{ [field]: "desc" as const }, { code: "asc" as const }],
    take: limit,
    // 0しかない月は表示しない場合は有効化
    // where: { [field]: { gt: 0 } as any },
  });

  // UI用に count を作る
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    count: (r as any)[field] ?? 0,
  }));
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
