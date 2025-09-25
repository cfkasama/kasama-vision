// app/api/admin/posts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * GET /api/admin/posts?limit=200&status=PUBLISHED|REMOVED|REALIZED
 *  管理画面用の投稿一覧
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return bad(401, "unauthorized");

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 100;

  const status = searchParams.get("status") as
    | "PUBLISHED"
    | "REMOVED"
    | "REALIZED"
    | null;

  try {
    const posts = await prisma.post.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,                 // "VISION" など
        status: true,               // "PUBLISHED" | "REMOVED" | "REALIZED"
        likeCount: true,
        recCount: true,
        cmtCount: true,
        createdAt: true,
        realizedAt: true,
        identityId: true,
        municipalityId: true,
      },
    });

    // 文字列にして返す（クライアントは string として扱っているため）
    const wire = posts.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      realizedAt: p.realizedAt ? p.realizedAt.toISOString() : null,
    }));

    return NextResponse.json({ ok: true, posts: wire });
  } catch (e) {
    console.error("[admin/posts] list failed:", e);
    return bad(500, "db_error");
  }
}
