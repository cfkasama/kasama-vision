import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok:false }, { status:401 });
  const { action, reportIds, note }:{ action:"DISMISS"|"REMOVE_POST"|"RESTORE_POST"|"MARK_RESOLVED"; reportIds:string[]; note?:string } = await req.json();
  if (!reportIds?.length) return NextResponse.json({ ok:false }, { status:400 });

  const resolver = (session as any).login as string;

  if (action === "DISMISS" || action === "MARK_RESOLVED") {
    await prisma.abuseReport.updateMany({ where: { id: { in: reportIds } }, data: { status:"RESOLVED", resolvedAt: new Date(), resolver, note }});
  } else if (action === "REMOVE_POST" || action === "RESTORE_POST") {
    const rep:{postId:string}[] = await prisma.abuseReport.findMany({ where: { id: { in: reportIds } }, select: { postId:true }});
    const ids = [...new Set(rep.map(r:{postId:string}[]=>r.postId))];
    await prisma.post.updateMany({ where: { id: { in: ids } }, data: { status: action==="REMOVE_POST" ? "REMOVED" : "PUBLISHED" }});
    await prisma.abuseReport.updateMany({ where: { id: { in: reportIds } }, data: { status:"RESOLVED", resolvedAt: new Date(), resolver, note }});
  }

  await writeAuditLog({ actor: resolver, action, targetType: "REPORT", targetId: reportIds, meta: { note: note || null } });
  return NextResponse.json({ ok:true });
}
