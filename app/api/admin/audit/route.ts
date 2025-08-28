import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok:false }, { status:401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const take = 50, skip = (page-1)*take;
  const actor = searchParams.get("actor") || undefined;
  const action = searchParams.get("action") || undefined;
  const q = searchParams.get("q") || undefined;

  const where:any = {};
  if (actor) where.actor = actor;
  if (action) where.action = action;
  if (q) where.OR = [{ targetId: { contains: q }}, { action: { contains: q }}];

  const [rows, total] = await Promise.all([
    prisma.adminLog.findMany({ where, orderBy:{ createdAt:"desc" }, take, skip }),
    prisma.adminLog.count({ where })
  ]);

  return NextResponse.json({ ok:true, rows, page, total, pages: Math.ceil(total/take) });
}
