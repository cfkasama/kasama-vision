// app/api/comments/[id]/recommend/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const { id } = params;
  if (!id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  // 匿名Identity（cookie）確保
  const jar = cookies();
  let identityId = jar.get("kid")?.value;
  if (!identityId) {
    const identity = await prisma.identity.create({ data: {} });
    identityId = identity.id;
    jar.set("kid", identityId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  try {
    // コメント & 紐づく投稿を取得
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, content: true, postId: true },
    });
    if (!comment) return NextResponse.json({ ok: false, error: "comment_not_found" }, { status: 404 });

    let became10 = false;

    await prisma.$transaction(async (tx) => {
      // 1) 推薦アクションを「一意制約」で追加（重複なら何もしない）
      await tx.$executeRawUnsafe(
        `INSERT INTO "CommentAction" ("commentId","identityId","type") VALUES ($1,$2,'RECOMMEND') ON CONFLICT DO NOTHING`,
        id,
        identityId
      );

      // 2) このユーザーの推薦が入っているか確認 → 入っていれば recCount++
      const acted = await tx.commentAction.findUnique({
        where: { commentId_identityId_type: { commentId: id, identityId, type: "RECOMMEND" } as any },
      });
      if (acted) {
        await tx.comment.update({
          where: { id },
          data: { recCount: { increment: 1 } },
        });
      }

      // 3) 総推薦数を正にカウント（レースに強い）し、ちょうど10ならPost化
      const total = await tx.commentAction.count({
        where: { commentId: id, type: "RECOMMEND" },
      });

      if (total === 10) {
        became10 = true;

        // すでに同内容の提案が直近で生成済みか軽く確認（念のため）
        const dup = await tx.post.findFirst({
          where: { type: "PROPOSAL", title: { equals: comment.content.slice(0, 80) } },
          select: { id: true },
        });
        if (!dup) {
          await tx.post.create({
            data: {
              type: "PROPOSAL",
              title: comment.content.slice(0, 80) || "提案",
              content: comment.content,
              status: "PUBLISHED",
            },
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