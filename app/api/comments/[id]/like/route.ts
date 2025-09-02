import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

    const updated = await prisma.comment.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true },
    });

    return NextResponse.json({ ok: true, ...updated });
  } catch (e) {
    console.error("[comments.like] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
