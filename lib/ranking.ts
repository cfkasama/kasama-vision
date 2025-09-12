// lib/ranking.ts
import { prisma } from "@/lib/db";

export type IntentKind = "LIVE" | "WORK" | "TOURISM";

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

export async function getIntentRankingMonthly(
  kind: IntentKind,
  limit = 20
) {
  const { start, end } = monthRange();

  // intent を自治体別に集計
  const rows = await prisma.intent.groupBy({
    by: ["municipalityId"],
    where: {
      kind,
      createdAt: { gte: start, lt: end },
    },
    _count: { _all: true },
  });

  if (!rows.length) return [];

  // 件数順で降順 → 上位のみ採用
  const sorted = rows
    .filter((r) => !!r.municipalityId)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, limit);

  // 自治体名/slug をまとめて取得
  const ids = sorted.map((r) => r.municipalityId!) as string[];
  const muniList = await prisma.municipality.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true },
  });

  // 表示用に合成（件数順を維持）
  return sorted
    .map((r) => {
      const m = muniList.find((mm) => mm.id === r.municipalityId);
      return m
        ? { id: m.id, name: m.name, slug: m.slug, count: r._count._all }
        : null;
    })
    .filter(Boolean) as { id: string; name: string; slug: string; count: number }[];
}
