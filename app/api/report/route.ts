// app/api/report/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  postId?: string;
  commentId?: string | null;
  reason?: "POST" | "COMMENT";
  note?: string;
};

export async function POST(req: Request) {
  let postId = "";
  let commentId: string | null = null;
  let reason: "POST" | "COMMENT" | undefined;
  let note = "";

  // ---- JSON 取得・バリデーション
  try {
    const b = (await req.json()) as Body;
    postId = String(b.postId ?? "");
    commentId = b.commentId ? String(b.commentId) : null;
    reason = b.reason;
    note = (b.note ?? "").slice(0, 2000);
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!postId) {
    return NextResponse.json({ ok: false, error: "postId_required" }, { status: 400 });
  }

  // reason の自動補完
  if (!reason) {
    reason = commentId ? "COMMENT" : "POST";
  }

  // ---- 対象存在チェック
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, lowExposureActive: true, tempHiddenActive: true } });
  if (!post) {
    return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
  }

  if (commentId) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true, postId: true } });
    if (!comment || comment.postId !== postId) {
      return NextResponse.json({ ok: false, error: "comment_mismatch" }, { status: 400 });
    }
  }

  // ---- 可能なら identityId を付与（cookie の anon_id を採用）
  let identityId: string | null = null;
  try {
    const c = await cookies();
    const anon = c.get("anon_id")?.value;
    if (anon) {
      // anon_id は Identity.id として発行している想定。存在しなくても create まではしない。
      const exists = await prisma.identity.findUnique({ where: { id: anon }, select: { id: true } });
      if (exists) identityId = exists.id;
    }
  } catch {
    // 取得失敗時は黙って null 運用
  }

  // ---- 通報レコード作成
  await prisma.abuseReport.create({
    data: {
      postId,
      commentId,      // ← コメント通報の場合のみセット。POST通報は null。
      reason,         // "POST" | "COMMENT"
      note,
      identityId,     // 取れなければ null
    },
  });

  // ---- 直近24hのユニーク通報者数で段階制御（投稿単位）
  // identityId が null の通報は "anon" に束ねて、最低限の重複抑止に使う
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const reports = await prisma.abuseReport.findMany({
    where: { postId, createdAt: { gte: since } },
    select: { identityId: true },
  });

  const uniques = new Set(reports.map(r => r.identityId ?? "anon")).size;

  // しきい値は従来どおり
  if (uniques >= 3 && !post.lowExposureActive) {
    await prisma.post.update({
      where: { id: postId },
      data: { lowExposureActive: true, lowExposureAt: new Date() },
    });
  }

  if (uniques >= 5 && !post.tempHiddenActive) {
    await prisma.post.update({
      where: { id: postId },
      data: { tempHiddenActive: true, tempHiddenAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}