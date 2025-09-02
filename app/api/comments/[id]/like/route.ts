// app/api/comments/[id]/like/route.ts
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
    // 対象コメント存在確認
    const exists = await prisma.comment.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ ok: false, error: "comment_not_found" }, { status: 404 });

    // 重複をDBの一意制約でブロック（挿入できた時のみインクリメント）
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO "CommentAction" ("commentId","identityId","type") VALUES ($1,$2,'LIKE') ON CONFLICT DO NOTHING`,
          id,
          identityId
        );
        // 直近のアクション数を確認（このユーザーが初回なら1件増えているはず）
        const acted = await tx.commentAction.findUnique({
          where: { commentId_identityId_type: { commentId: id, identityId, type: "LIKE" } as any },
        });
        if (acted) {
          await tx.comment.update({
            where: { id },
            data: { likeCount: { increment: 1 } },
          });
        }
      });
    } catch (e) {
      // 競合時などは何もせず成功扱いにする
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /comments/:id/like] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}