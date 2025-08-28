import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function assertCronAuth(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key !== process.env.CRON_SECRET) throw new Error("unauthorized");
}
function hoursSince(d: Date) {
  return Math.max(1, (Date.now() - d.getTime()) / 3600000);
}

export async function POST(req: Request) {
  try {
    assertCronAuth(req);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const posts = await prisma.post.findMany({
      where: { status: "PUBLISHED", createdAt: { gte: since } },
      select: { id: true, createdAt: true, likeCount: true, recCount: true, cmtCount: true }
    });
    const updates = posts.map((p:{id:string;createdAt:Date;likeCount:number;recCount:number;cmtCount:number}) => {
      const score = (p.likeCount * 2 + p.recCount * 4 + p.cmtCount) / Math.pow(hoursSince(p.createdAt), 1.5);
      return prisma.post.update({ where: { id: p.id }, data: { hotScore: score } });
    });
    await prisma.$transaction(updates, { timeout: 30000 });

    const rows = await prisma.$queryRaw<{ tag_id: string; tag_name: string; cnt: number }[]>`
      SELECT t.id as tag_id, t.name as tag_name, COUNT(*)::int as cnt
      FROM "PostTag" pt
      JOIN "Post" p ON p.id = pt."postId" AND p.status = 'PUBLISHED'
      JOIN "Tag"  t ON t.id = pt."tagId"
      GROUP BY t.id, t.name
      ORDER BY cnt DESC, t.name ASC
      LIMIT 5
    `;
    await prisma.tagTop5.deleteMany({});
    if (rows.length) {
      await prisma.tagTop5.createMany({ data: rows.map(r => ({ tagId: r.tag_id, tagName: r.tag_name, count: r.cnt })) });
    }
    return NextResponse.json({ ok: true, hotUpdated: posts.length, topTags: rows.length });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message || "fail" }, { status: 400 });
  }
}
