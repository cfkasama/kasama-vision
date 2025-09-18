// app/api/posts/[id]/like/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertNotLocked } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// POST /api/posts/:id/like
export async function POST(req: Request, { params }: Params) {
    const identityId = await getOrCreateIdentityId();
  await assertNotLocked(identityId); // ← ここでロック中なら即 403
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
