import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const { postId, reason } = await req.json();
  if (!postId || !reason) return NextResponse.json({ ok:false }, { status:400 });
  const identityId = await getOrCreateIdentityId();

  const since = new Date(Date.now() - 24*60*60*1000);
  const dup = await prisma.abuseReport.findFirst({ where:{ postId, identityId, createdAt: { gte: since } }});
  if (dup) return NextResponse.json({ ok:true, duplicate:true });

  await prisma.abuseReport.create({ data: { postId, reason, identityId }});

  // count uniques for threshold
  const reports = await prisma.abuseReport.findMany({ where: { postId, createdAt: { gte: since } }, select: { identityId: true } });
  const uniques = new Set(reports.map(r => r.identityId || "anon")).size;
  const post = await prisma.post.findUnique({ where:{ id: postId }, select:{ lowExposureActive:true, tempHiddenActive:true }});

  if (uniques >= 3 && !post?.lowExposureActive) {
    await prisma.post.update({ where:{ id: postId }, data:{ lowExposureActive:true, lowExposureAt: new Date() } });
    await writeAuditLog({ actor:"system", action:"LOW_EXPOSURE_ON", targetType:"POST", targetId: postId, meta:{ reports: uniques }});
  }
  if (uniques >= 5 && !post?.tempHiddenActive) {
    await prisma.post.update({ where:{ id: postId }, data:{ tempHiddenActive:true, tempHiddenAt: new Date() } });
    await writeAuditLog({ actor:"system", action:"TEMP_HIDE_ON", targetType:"POST", targetId: postId, meta:{ reports: uniques }});
  }

  return NextResponse.json({ ok:true });
}
