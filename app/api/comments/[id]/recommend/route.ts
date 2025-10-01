// app/api/comments/[id]/recommend/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId, assertNotLocked } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/**
 * 推薦（コメント）: POST /api/comments/:id/recommend
 * ・同一 identity の二重押しは 409
 * ・ロック中 identity は 403
 * ・ソフト削除済みコメントは 404
 * ・recCount が NULL でも安全に +1
 * ・しきい値到達時に「提案(Post)」を自動生成（同一自治体×同タイトルの重複を防止）
 */
export async function POST(_req: Request, { params }: Params) {
  const { id } = params || {};
  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    const identityId = await getOrCreateIdentityId();
    await assertNotLocked(identityId); // ロック中なら 403
  } catch (e: any) {
    // assertNotLocked 内で throw された
    return NextResponse.json({ ok: false, error: "locked" }, { status: 403 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // コメント + 親ポストの自治体IDを取得（ソフトデリートも確認）
      const comment = await tx.comment.findUnique({
        where: { id },
        select: {
          id: true,
          content: true,
          recCount: true,
          deletedAt: true,
          post: { select: { id: true, title: true, municipalityId: true } },
        },
      });

      if (!comment || comment.deletedAt) {
        return { status: 404 as const, body: { ok: false, error: "not_found" } };
      }
      if (!comment.post?.municipalityId) {
        // 念のための防御
        return { status: 500 as const, body: { ok: false, error: "no_municipality_on_post" } };
      }

      // 同一 identity の二重押し防止（複合ユニークで判定）
      const acted = await tx.commentAction.findUnique({
        where: {
          commentId_identityId_type: {
            commentId: id,
            identityId: await getOrCreateIdentityId(),
            type: "RECOMMEND",
          },
        },
      });
      if (acted) {
        return { status: 409 as const, body: { ok: false, error: "already_recommended" } };
      }

      // アクション記録
      await tx.commentAction.create({
        data: { commentId: id, identityId: await getOrCreateIdentityId(), type: "RECOMMEND" },
      });

      // NULL セーフに +1
      const updated = await tx.comment.update({
        where: { id },
        data: {
          recCount: comment.recCount == null ? 1 : { increment: 1 },
        },
        select: { recCount: true },
      });

      // しきい値チェック → 自動で「提案」を作成（重複タイトル防止）
      const THRESHOLD = 10;
      if ((updated.recCount ?? 0) >= THRESHOLD) {
        const title = comment.post.title || "提案";

        const already = await tx.post.findFirst({
          where: {
            type: "PROPOSAL",
            title,
            municipalityId: comment.post.municipalityId,
            status: "PUBLISHED",
          },
          select: { id: true },
        });

        if (!already) {
          await tx.post.create({
            data: {
              type: "PROPOSAL",
              title,
              content: comment.content ?? "",
              status: "PUBLISHED",
              municipality: { connect: { id: comment.post.municipalityId } },
              // identityId を提案の作成者として紐付けたい場合はここで付与:
              // identityId: await getOrCreateIdentityId(),
            },
          });
        }
      }

      return { status: 200 as const, body: { ok: true, recCount: updated.recCount ?? 0 } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    // Prisma のユニーク衝突などを 409 に寄せる（同時押し対策）
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "conflict" }, { status: 409 });
    }
    console.error("[POST /api/comments/:id/recommend] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}