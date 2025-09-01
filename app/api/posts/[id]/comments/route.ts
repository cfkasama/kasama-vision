import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const comments = await prisma.comment.findMany({
    where: { postId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, comments });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  }

  const c = await prisma.comment.create({
    data: { postId: params.id, content },
  });

  return NextResponse.json({ ok: true, comment: c });
}