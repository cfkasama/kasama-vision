// app/api/comments/[id]/recommend/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";
import { assertNotLocked } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/**
 * 推薦（コメント）: POST /api/comments/:id/recommend
 * ・同一端末/identity の二重押しは 409
 * ・しきい値到達時に「提案(Post)」を自動生成（※同一自治体内で重複タイトルは作らない）
 */
export async function POST(_req: Request, { params }: Params) {
    const identityId = await getOrCreateIdentityId();
  await assertNotLocked(identityId); // ← ここでロック中なら即 403
  const { id } = params;
  if (!id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  try {
    const identityId = await getOrCreateIdentityId();

    const result = await prisma.$transaction(async (tx) => {
      // コメント取得 + 親ポストの自治体ID取得
      const comment = await tx.comment.findUnique({
        where: { id },
        select: {
          id: true,
          content: true,
          recCount: true,
          post: { select: { id: true, title: true, municipalityId: true } },
        },
      });
      if (!comment) return { status: 404 as const, body: { ok: false, error: "not_found" } };
      if (!comment.post?.municipalityId) {
        // 親ポストに自治体が必須になっている前提だが、念のため
        return { status: 500 as const, body: { ok: false, error: "no_municipality_on_post" } };
      }

      // 端末/identity の二重押し防止（CommentAction などを使っている想定）
      const acted = await tx.commentAction.findUnique({
        where: {
          commentId_identityId_type: { commentId: id, identityId, type: "RECOMMEND" },
        } as any,
      });
      if (acted) return { status: 409 as const, body: { ok: false, error: "already_recommended" } };

      // アクション記録 & カウントUP
      await tx.commentAction.create({
        data: { commentId: id, identityId, type: "RECOMMEND" },
      });
      const updated = await tx.comment.update({
        where: { id },
        data: { recCount: { increment: 1 } },
        select: { recCount: true },
      });

      // しきい値到達で「提案」自動作成（同一自治体内でタイトル重複チェック）
      const THRESHOLD = 10;
      if ((updated.recCount ?? 0) >= THRESHOLD) {
        const title = comment.post.title || "提案";
        const dup = await tx.post.findFirst({
          where: {
            type: "PROPOSAL",
            title,
            municipalityId: comment.post.municipalityId,
            status: "PUBLISHED",
          },
          select: { id: true },
        });

        if (!dup) {
          await tx.post.create({
            data: {
              type: "PROPOSAL",
              title,
              content: comment.content ?? "",
              status: "PUBLISHED",
              municipality: { connect: { id: comment.post.municipalityId } }, // ★ 必須
              // identityId: 任意で紐づけたい場合はここで
            },
          });
        }
      }

      return { status: 200 as const, body: { ok: true } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    console.error("[POST /api/comments/:id/recommend] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
