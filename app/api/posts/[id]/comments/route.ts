// app/api/posts/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";

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
      where: { postId: id },
      orderBy: { createdAt: "desc" },
      // Prisma モデルに存在するフィールドだけ選ぶ（recCount を未追加でも型エラーにならない）
      select: {
        id: true,
        content: true,
        createdAt: true,
        likeCount: true,
        postId: true,
        identityId: true,
      },
    });
    return NextResponse.json({ ok: true, comments }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("[GET /posts/:id/comments] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

// POST /api/posts/:id/comments
// body: { content: string; recaptchaToken: string }
export async function POST(req: Request, { params }: Params) {
  const { id } = params;
  if (!id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  let content = "";
  let recaptchaToken = "";
  try {
    const body = await req.json();
    content = String((body?.content ?? "")).trim();
    recaptchaToken = String(body?.recaptchaToken ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!content) return NextResponse.json({ ok: false, error: "content_required" }, { status: 400 });
  if (!recaptchaToken) return NextResponse.json({ ok: false, error: "recaptcha_required" }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ ok: false, error: "content_too_long" }, { status: 400 });

  try {
    // reCAPTCHA 検証
    const ok = await verifyRecaptcha(recaptchaToken);
    if (!ok) return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });

    // 投稿があるか先に確認
    const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
    if (!post) return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });

    // 匿名 Identity を Cookie で維持（なければ作成）
    const jar = cookies();
    let identityId = jar.get("kid")?.value;
    if (!identityId) {
      const identity = await prisma.identity.create({ data: {} });
      identityId = identity.id;
      // 1年保持、httpOnly/lax で安全に
      jar.set("kid", identityId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    // 二重連投ガード：同一 identity が 60 秒以内に同一内容を同一ポストに投げていたら重複扱い
    const since = new Date(Date.now() - 60_000);
    const dup = await prisma.comment.findFirst({
      where: { postId: id, identityId, content, createdAt: { gte: since } },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ ok: true, id: dup.id, duplicated: true });
    }

    // コメント作成（identityId を必ず付与）
    const created = await prisma.comment.create({
      data: { postId: id, content, identityId },
      select: { id: true, content: true, createdAt: true, likeCount: true, postId: true, identityId: true },
    });

    // 失敗しても致命ではないので分離
    prisma.post
      .update({ where: { id }, data: { cmtCount: { increment: 1 } } })
      .catch((incErr) => console.warn("[POST comments] cmtCount increment failed:", incErr));

    return NextResponse.json({ ok: true, comment: created });
  } catch (e: any) {
    console.error("[POST /posts/:id/comments] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}