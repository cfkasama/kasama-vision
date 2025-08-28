import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import type { AbuseIdentityRow } from "@/types/db";

export async function POST(req: Request) {
  const { postId, reason } = await req.json();

  // abuseReport 作成
  await prisma.abuseReport.create({
    data: { postId, reason },
  });

  // 直近24hの通報数を集計
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const reports = (await prisma.abuseReport.findMany({
    where: { postId, createdAt: { gte: since } },
    select: { identityId: true },
  })) as AbuseIdentityRow[];

  const uniques = new Set(
    reports.map((r: AbuseIdentityRow) => r.identityId || "anon")
  ).size;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { lowExposureActive: true, tempHiddenActive: true },
  });

  if (uniques >= 3 && !post?.lowExposureActive) {
    await prisma.post.update({
      where: { id: postId },
      data: { lowExposureActive: true, lowExposureAt: new Date() },
    });
  }

  if (uniques >= 5 && !post?.tempHiddenActive) {
    await prisma.post.update({
      where: { id: postId },
      data: { tempHiddenActive: true, tempHiddenAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}