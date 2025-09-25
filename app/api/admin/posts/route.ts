// app/api/admin/posts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);
  const page  = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const status = searchParams.get("status"); // "PUBLISHED" | "REMOVED" | "REALIZED" | null

  const where = status && status !== "ALL"
    ? { status: status as any }
    : {};

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, title: true, content: true,
        type: true, status: true,
        likeCount: true, recCount: true, cmtCount: true,
        createdAt: true, realizedAt: true,
        identityId: true, municipalityId: true,
        municipality: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, posts, total, page, limit });
}