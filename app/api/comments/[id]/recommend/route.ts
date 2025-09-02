import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";

const THRESHOLD = 10;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;
    if (!commentId) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    // reCAPTCHA は任意（来たときだけ検証）
    let recaptchaOk = true;
    try {
      const body = await req.json().catch(() => ({}));
      const token = body?.recaptchaToken;
      if (token) recaptchaOk = await verifyRecaptcha(token);
    } catch {/* no-op */}
    if (!recaptchaOk) {
      return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!comment) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { recCount: { increment: 1 } },
      select: { id: true, recCount: true, content: true, postId: true },
    });

    let createdPostId: string | null = null;

    if (updated.recCount >= THRESHOLD) {
      const existing = await prisma.adminLog.findFirst({
        where: { action: "AUTO_PROPOSAL_FROM_COMMENT", target: `comment:${updated.id}` },
        select: { id: true, postId: true },
      });

      if (!existing) {
        const firstLine = (updated.content ?? "").split(/\r?\n/)[0]?.trim() || "提案";
        const title = firstLine.slice(0, 40);

        const newPost = await prisma.post.create({
          data: {
            type: "PROPOSAL",
            status: "PUBLISHED",
            title,
            content: updated.content ?? "",
          },
          select: { id: true },
        });
        createdPostId = newPost.id;

        await prisma.adminLog.create({
          data: {
            actor: "system",
            action: "AUTO_PROPOSAL_FROM_COMMENT",
            target: `comment:${updated.id}`,
            note: "推薦が閾値に到達したため自動で提案化",
            postId: newPost.id,
            meta: {
              sourceCommentId: updated.id,
              sourcePostId: updated.postId,
              threshold: THRESHOLD,
            } as any,
          },
        });
      } else {
        createdPostId = existing.postId ?? null;
      }
    }

    return NextResponse.json({
      ok: true,
      commentId: updated.id,
      recCount: updated.recCount,
      reachedThreshold: updated.recCount >= THRESHOLD,
      createdPostId,
    });
  } catch (e) {
    console.error("[comments.recommend] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}