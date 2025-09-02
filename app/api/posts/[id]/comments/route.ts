import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { hashDeleteKey } from "@/lib/hash";

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
      where: { postId: id, deletedAt: null }, // 論理削除は除外
      orderBy: { createdAt: "desc" },
      select: {
        id: true, content: true, createdAt: true,
        likeCount: true, recCount: true, postId: true, identityId: true
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
  let recaptchaToken = "";
  let deleteKeyPlain = "";
  try {
    const body = await req.json();
    content = String((body?.content ?? "")).trim();
    recaptchaToken = String(body?.recaptchaToken ?? "");
    deleteKeyPlain = String(body?.deleteKey ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!content) return NextResponse.json({ ok: false, error: "content_required" }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ ok: false, error: "content_too_long" }, { status: 400 });
  if (!deleteKeyPlain) return NextResponse.json({ ok: false, error: "delete_key_required" }, { status: 400 });
  if (!recaptchaToken) return NextResponse.json({ ok: false, error: "recaptcha_required" }, { status: 400 });

  try {
    const ok = await verifyRecaptcha(recaptchaToken);
    if (!ok) return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });

    const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
    if (!post) return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });

    const hashed = await hashDeleteKey(deleteKeyPlain);

    const created = await prisma.comment.create({
      data: { postId: id, content, deleteKey: hashed, identityId: null }, // 匿名OK
      select: { id: true },
    });

    // cmtCount を加算（失敗しても致命ではない）
    prisma.post.update({
      where: { id },
      data: { cmtCount: { increment: 1 } },
    }).catch((e)=>console.warn("cmtCount increment failed:", e));

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    console.error("[POST /posts/:id/comments] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}