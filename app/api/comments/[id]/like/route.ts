import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  try {
    const id = ctx?.params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
    }

    // 1) 先に存在チェック（ソフトデリート除外）
    const c = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, likeCount: true },
    });
    if (!c || c.deletedAt) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // 2) NULL を踏まえて安全にインクリメント
    //    likeCount が nullable の場合は COALESCE 的に 0 にしてから +1
    const updated = await prisma.comment.update({
      where: { id },
      data: {
        likeCount: c.likeCount === null ? 1 : { increment: 1 },
      },
      select: { id: true, likeCount: true },
    });

    return NextResponse.json({ ok: true, likeCount: updated.likeCount });
  } catch (e) {
    console.error("[POST /api/comments/:id/like] error", e);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}