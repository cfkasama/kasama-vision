// app/api/posts/[id]/like/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// POST /api/posts/:id/like
export async function POST(req: Request, { params }: Params) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    const post = await prisma.post.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true },
    });

    return NextResponse.json({ ok: true, likeCount: post.likeCount });
  } catch (err) {
    console.error("[POST /api/posts/:id/like] error:", err);
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}