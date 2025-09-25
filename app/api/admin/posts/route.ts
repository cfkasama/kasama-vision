// app/api/admin/posts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type SortKey =
  | "createdAtDesc"
  | "createdAtAsc"
  | "likesDesc"
  | "likesAsc"
  | "recsDesc"
  | "recsAsc"
  | "cmtsDesc"
  | "cmtsAsc"
  | "realizedAtDesc"
  | "realizedAtAsc";

const SORTS: Record<
  SortKey,
  { field: "createdAt" | "likeCount" | "recCount" | "cmtCount" | "realizedAt"; dir: "asc" | "desc" }
> = {
  createdAtDesc: { field: "createdAt", dir: "desc" },
  createdAtAsc: { field: "createdAt", dir: "asc" },
  likesDesc: { field: "likeCount", dir: "desc" },
  likesAsc: { field: "likeCount", dir: "asc" },
  recsDesc: { field: "recCount", dir: "desc" },
  recsAsc: { field: "recCount", dir: "asc" },
  cmtsDesc: { field: "cmtCount", dir: "desc" },
  cmtsAsc: { field: "cmtCount", dir: "asc" },
  realizedAtDesc: { field: "realizedAt", dir: "desc" },
  realizedAtAsc: { field: "realizedAt", dir: "asc" },
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);

  const status = (searchParams.get("status") ?? "ALL") as
    | "ALL"
    | "PUBLISHED"
    | "REMOVED"
    | "REALIZED";

  const q = (searchParams.get("q") ?? "").trim();
  const sort = (searchParams.get("sort") as SortKey) || "createdAtDesc";

  const where: any = {};
  if (status !== "ALL") where.status = status;

  if (q) {
    // タイトル/本文を部分一致・大文字小文字無視
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }

  const orderBy =
    SORTS[sort] ? [{ [SORTS[sort].field]: SORTS[sort].dir }] : [{ createdAt: "desc" as const }];

  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        status: true,
        likeCount: true,
        recCount: true,
        cmtCount: true,
        createdAt: true,
        realizedAt: true,
        identityId: true,
        municipalityId: true,
        municipality: { select: { id: true, name: true, slug: true } }, // ← 名称を同時取得
      },
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    posts: rows,
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}