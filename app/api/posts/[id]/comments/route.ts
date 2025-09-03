import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { hashDeleteKey } from "@/lib/hash"; // argon2 導入済み前提
import { getOrCreateIdentityId } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { id: string } };

// GET /api/posts/:id/comments
export async function GET(_req: Request, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: id, deletedAt: null },          // 論理削除を除外
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        likeCount: true,
        recCount: true,                                 // 追加済みカラム
        postId: true,
        identityId: true,
      },
    });
    return NextResponse.json({ ok: true, comments });
  } catch (e: any) {
    console.error("[GET /posts/:id/comments] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

// POST /api/posts/:id/comments
export async function POST(req: Request, { params }: Params) {
  const { id } = params;
  if (!id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  let content = "";
  let deleteKey = "";
  let recaptchaToken = "";
  try {
    const body = await req.json();
    content = String(body?.content ?? "").trim();
    deleteKey = String(body?.deleteKey ?? "").trim();
    recaptchaToken = String(body?.recaptchaToken ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!content) return NextResponse.json({ ok: false, error: "content_required" }, { status: 400 });
  if (!deleteKey) return NextResponse.json({ ok: false, error: "deleteKey_required" }, { status: 400 });
  if (!recaptchaToken) return NextResponse.json({ ok: false, error: "recaptcha_required" }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ ok: false, error: "content_too_long" }, { status: 400 });

  try {
    // reCAPTCHA 検証
    const ok = await verifyRecaptcha(recaptchaToken);
    if (!ok) return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });

    // 投稿の存在確認
    const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
    if (!post) return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });

    // 削除キーをハッシュ化して保存（平文は保存しない）
    const hashed = await hashDeleteKey(deleteKey);
     const identityId = await getOrCreateIdentityId();
    // コメント作成（identityId は匿名可なので null）
    const created = await prisma.comment.create({
      data: { postId: id, content, identityId, deleteKey: hashed },
      select: { id: true },
    });

    // カウントは失敗しても致命ではない
    prisma.post
      .update({ where: { id }, data: { cmtCount: { increment: 1 } } })
      .catch((err) => console.warn("[comments POST] cmtCount inc failed:", err));

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    console.error("[POST /posts/:id/comments] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
