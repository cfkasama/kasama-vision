import { NextResponse } from "next/server";
import { getOrCreateIdentityId } from "@/lib/identity";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const { id } = params;
  if (!id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  // 匿名 Identity を確保（cookie: kid）
  const jar = cookies();
  const identityId = await getOrCreateIdentityId();

  try {
    const exists = await prisma.comment.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ ok: false, error: "comment_not_found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      let created = false;
      try {
        await tx.commentAction.create({
          data: { commentId: id, identityId, type: "LIKE" },
        });
        created = true;
      } catch (e: any) {
        // P2002 = unique violation（すでに押してる）
        if (e?.code !== "P2002") throw e;
      }
      if (created) {
        await tx.comment.update({ where: { id }, data: { likeCount: { increment: 1 } } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /comments/:id/like] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
