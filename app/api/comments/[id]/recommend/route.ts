import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  try {
    const id = ctx?.params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
    }

    const c = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, recCount: true },
    });
    if (!c || c.deletedAt) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: {
        recCount: c.recCount === null ? 1 : { increment: 1 },
      },
      select: { id: true, recCount: true },
    });

    return NextResponse.json({ ok: true, recCount: updated.recCount ?? 0 });
  } catch (e) {
    console.error("[POST /api/comments/:id/recommend] error", e);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}