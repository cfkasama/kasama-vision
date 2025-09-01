// app/api/posts/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { id: string } };

// GET /api/posts/:id/comments
export async function GET(_req: Request, { params }: Params) {
  const { id } = params; // ← ディレクトリ名が [id] なのでここは id
  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        likeCount: true,
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

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const content = (body.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ ok: false, error: "content_required" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ ok: false, error: "content_too_long" }, { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id }, select: { id: true } });
      if (!post) throw new Error("post_not_found");

      const c = await tx.comment.create({
        data: { postId: id, content, identityId: null },
        select: { id: true },
      });
      await tx.post.update({ where: { id }, data: { cmtCount: { increment: 1 } } });
      return c;
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    console.error("[POST /posts/:id/comments] error:", e);
    const msg = String(e?.message ?? e);
    if (msg.includes("post_not_found")) {
      return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "server_error", detail: msg }, { status: 500 });
  }
}