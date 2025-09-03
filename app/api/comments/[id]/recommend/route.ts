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

  const identityId = await getOrCreateIdentityId();

  try {
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, content: true, postId: true },
    });
    if (!comment) return NextResponse.json({ ok: false, error: "comment_not_found" }, { status: 404 });

    let became10 = false;

    await prisma.$transaction(async (tx) => {
      let created = false;
      try {
        await tx.commentAction.create({
          data: { commentId: id, identityId, type: "RECOMMEND" },
        });
        created = true;
      } catch (e: any) {
        if (e?.code !== "P2002") throw e; // 二重は無視
      }

      if (created) {
        await tx.comment.update({ where: { id }, data: { recCount: { increment: 1 } } });
      }

      // 実数でカウント（DBが真実）
      const total = await tx.commentAction.count({
        where: { commentId: id, type: "RECOMMEND" },
      });

      if (total === 10) {
        became10 = true;
        const title = (comment.content ?? "").slice(0, 80) || "提案";
        const dup = await tx.post.findFirst({ where: { type: "PROPOSAL", title }, select: { id: true } });
        if (!dup) {
          await tx.post.create({
            data: { type: "PROPOSAL", title, content: comment.content ?? "", status: "PUBLISHED" },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, became10 });
  } catch (e: any) {
    console.error("[POST /comments/:id/recommend] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
