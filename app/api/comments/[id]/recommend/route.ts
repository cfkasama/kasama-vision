import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const commentId = params.id;

  // 推薦数を +1
  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: { recCount: { increment: 1 } },
  });

  // もし推薦が10に達したら、新しいPostに昇格
  if (comment.recCount >= 10) {
    const newPost = await prisma.post.create({
      data: {
        type: "PROPOSAL",
        title: comment.content.slice(0, 50) || "推薦された提案",
        content: comment.content,
        status: "PUBLISHED",
      },
    });

    return NextResponse.json({ ok: true, promoted: true, postId: newPost.id });
  }

  return NextResponse.json({ ok: true, promoted: false });
}
