import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const logs = await prisma.modLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { post: { select: { id:true, title:true } } }
  });
  return NextResponse.json({ ok:true, logs });
}
