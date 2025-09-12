// app/api/posts/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { hashDeleteKey } from "@/lib/hash";
import { getOrCreateIdentityId } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { id: string } };

// 許容するコメント種別
const ALLOWED_KINDS = ["COMMENT", "CHALLENGE", "ACHIEVEMENT"] as const;
type CommentKind = (typeof ALLOWED_KINDS)[number];

// GET /api/posts/:id/comments
export async function GET(_req: Request, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        likeCount: true,
        recCount: true,
        postId: true,
        identityId: true,
        kind: true, // ← バッジ表示に必要
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
  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // ここでスコープ外にならないように先に宣言
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const content = String(body?.content ?? "").trim();
  const deleteKey = String(body?.deleteKey ?? "").trim();
  const recaptchaToken = String(body?.recaptchaToken ?? "").trim();
  const kindRaw = String(body?.kind ?? "COMMENT").trim().toUpperCase();
  const kind: CommentKind = (ALLOWED_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as CommentKind)
    : "COMMENT";

  if (!content) return NextResponse.json({ ok: false, error: "content_required" }, { status: 400 });
  if (!deleteKey) return NextResponse.json({ ok: false, error: "deleteKey_required" }, { status: 400 });
  if (!recaptchaToken) return NextResponse.json({ ok: false, error: "recaptcha_required" }, { status: 400 });
  if (content.length > 2000)
    return NextResponse.json({ ok: false, error: "content_too_long" }, { status: 400 });

  try {
    // reCAPTCHA 検証
    const ok = await verifyRecaptcha(recaptchaToken);
    if (!ok) return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });

    // 投稿の存在確認
    const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
    if (!post) return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });

    // 削除キーをハッシュ化
    const hashed = await hashDeleteKey(deleteKey);

    // 匿名識別子（存在しなければ作成）
    const identityId = await getOrCreateIdentityId();

    // コメント作成
    const created = await prisma.comment.create({
      data: {
        postId: id,
        content,
        kind,           // ← 正規化済み
        identityId,
        deleteKey: hashed,
      },
      select: { id: true },
    });

// ★ kind に応じて post.status を変更
if (created.kind === "CHALLENGE") {
  await prisma.post.update({
    where: { id },
    data: { status: "CHALLENGE" }, // Prisma schemaに追加必要
  });
}
if (created.kind === "ACHIEVEMENT") {
  await prisma.post.update({
    where: { id },
    data: { status: "REALIZED" },
  });
}

    // カウント更新（失敗しても致命ではない）
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