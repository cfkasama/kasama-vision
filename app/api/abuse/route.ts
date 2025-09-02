import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/abuse
// body: { postId?: string; commentId?: string; reason?: string; note?: string; meta?: any }
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const inputPostId = body?.postId ? String(body.postId) : null;
  const commentId   = body?.commentId ? String(body.commentId) : null;
  const reason      = body?.reason ? String(body.reason) : null; // "POST" | "COMMENT" など想定
  const note        = body?.note ? String(body.note).slice(0, 2000) : null;
  const meta        = body?.meta ?? null;

  try {
    let postId = inputPostId;

    // commentId が来た場合は、そのコメントの postId を優先的に採用
    if (commentId) {
      const c = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true, postId: true },
      });
      if (!c) {
        return NextResponse.json({ ok: false, error: "comment_not_found" }, { status: 404 });
      }
      postId = c.postId; // 整合性を強制
    }

    // postId がまだ無ければエラー
    if (!postId) {
      return NextResponse.json({ ok: false, error: "post_id_required" }, { status: 400 });
    }

    // 投稿の存在確認
    const p = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!p) {
      return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
    }

    await prisma.abuseReport.create({
      data: {
        postId,
        commentId: commentId ?? undefined,
        reason: reason ?? undefined,
        note: note ?? undefined,
        meta: meta ?? undefined,
        identityId: null, // 匿名
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /api/abuse] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}