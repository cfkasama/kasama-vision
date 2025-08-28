import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const comments = await prisma.comment.findMany({
    where: { postId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, comments });
}