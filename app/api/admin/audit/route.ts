import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Query = {
  page?: string;
  actor?: string | null;
  action?: string | null;
  q?: string | null;
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q: Query = {
    page: searchParams.get("page") ?? undefined,
    actor: searchParams.get("actor"),
    action: searchParams.get("action"),
    q: searchParams.get("q"),
  };

  const page = Number(q.page ?? "1");
  const take = 50;
  const skip = (page - 1) * take;

  const where: any = {};
  if (q.actor) where.actor = q.actor;
  if (q.action) where.action = q.action;
  if (q.q) where.OR = [{ targetId: { contains: q.q } }, { action: { contains: q.q } }];

  const [rows, total] = await Promise.all([
    prisma.adminLog.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.adminLog.count({ where }),
  ]);

  return NextResponse.json({ ok: true, rows, page, total, pages: Math.ceil(total / take) });
}