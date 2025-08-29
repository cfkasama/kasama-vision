// app/api/jobs/recalc/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";                 // ★ 追加
import type { PostLite } from "@/lib/db-shapes";         // db-shapes派なら
// import type { PostLite, TopTagRow } from "@/types/db"; // types派ならこっち
type TopTagRow = { tag_id: string; tag_name: string; cnt: number };

function assertCronAuth(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key !== process.env.CRON_SECRET) throw new Error("unauthorized");
}
const hoursSince = (d: Date) => Math.max(1, (Date.now() - d.getTime()) / 3600000);

export async function POST(req: Request) {
  try {
    assertCronAuth(req);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1) 投稿取得（title不要の軽量型）
    const posts = (await prisma.post.findMany({
      select: { id: true, createdAt: true, likeCount: true, recCount: true, cmtCount: true },
      where: { status: "PUBLISHED", createdAt: { gte: since } },
    })) as PostLite[];

    // 2) トランザクション配列に“明示型”を付ける
    const updates: Prisma.PrismaPromise<any>[] = posts.map((p: PostLite) => {
      const score =
        (p.likeCount * 2 + p.recCount * 4 + p.cmtCount) /
        Math.pow(hoursSince(p.createdAt), 1.5);
      return prisma.post.update({
        where: { id: p.id },
        data: { hotScore: score },
      });
    });

    // 3) オプション省略で $transaction を素直に呼ぶ（オーバーロードエラー回避）
    await prisma.$transaction(updates);

    // 4) $queryRaw は Prisma.sql を使うと型解決が安定
    const rows = await prisma.$queryRaw<TopTagRow[]>(Prisma.sql`
      SELECT t.id as tag_id, t.name as tag_name, COUNT(*)::int as cnt
      FROM "PostTag" pt
      JOIN "Post" p ON p.id = pt."postId" AND p.status = 'PUBLISHED'
      JOIN "Tag"  t ON t.id = pt."tagId"
      GROUP BY t.id, t.name
      ORDER BY cnt DESC, t.name ASC
      LIMIT 5
    `);

    // 5) createMany の data も素直に map
    await prisma.tagTop5.deleteMany({});
    if (rows.length) {
      await prisma.tagTop5.createMany({
        data: rows.map((r) => ({
          tagId: r.tag_id,
          tagName: r.tag_name,
          count: r.cnt,
        })),
      });
    }

    return NextResponse.json({
      ok: true,
      hotUpdated: posts.length,
      topTags: rows.length,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "fail" }, { status: 400 });
  }
}