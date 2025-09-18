// app/api/admin/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") as "PUBLISHED" | "REMOVED" | null) || null;
  const q = searchParams.get("q")?.trim() || "";
  const user = searchParams.get("user")?.trim() || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const skip = Math.max(0, (page - 1) * limit);

  const where: any = {};
  if (status === "PUBLISHED") where.deletedAt = null;
  if (status === "REMOVED") where.deletedAt = { not: null };
  if (q) where.content = { contains: q };
  if (user) where.identityId = user;

  const [items, nextProbe] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        deletedAt: true,
        createdAt: true,
        identityId: true,
        post: { select: { id: true, title: true } },
      },
    }),
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: skip + limit,
      take: 1,
      select: { id: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    comments: items,
    hasNext: nextProbe.length > 0,
  });
}