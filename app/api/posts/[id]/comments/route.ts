// app/api/posts/[postId]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";       // ← PrismaはEdge非対応。必ずNodeで。
export const dynamic = "force-dynamic";

type Params = { params: { postId: string } };

export async function GET(_req: Request, { params }: Params) {
  const { postId } = params;
  if (!postId) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  try {
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, likeCount: true, createdAt: true, postId: true, identityId: true },
    });
    return NextResponse.json({ ok: true, comments });
  } catch (e: any) {
    console.error("[GET comments] error", e);
    return NextResponse.json({ ok: false, error: "server_error", detail: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const { postId } = params;
  if (!postId) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

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
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (!post) throw new Error("post_not_found");

      const created = await tx.comment.create({
        data: { postId, content, identityId: null },
        select: { id: true },
      });

      await tx.post.update({
        where: { id: postId },
        data: { cmtCount: { increment: 1 } },
      });

      return created;
    });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (e: any) {
    console.error("[POST comment] error", e);
    const msg = String(e?.message ?? e);
    if (msg.includes("post_not_found")) {
      return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "server_error", detail: msg }, { status: 500 });
  }
}