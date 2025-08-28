import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";

type ReactionBody = {
  postId: string;
  type: "LIKE" | "RECOMMEND";
};

export async function POST(req: Request) {
  const { postId, type } = (await req.json()) as ReactionBody;
  if (!postId || (type !== "LIKE" && type !== "RECOMMEND")) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const identityId = await getOrCreateIdentityId();
  try {
    await prisma.reaction.create({ data: { postId, identityId, type } });
    await prisma.post.update({
      where: { id: postId },
      data: {
        likeCount: type === "LIKE" ? { increment: 1 } : undefined,
        recCount: type === "RECOMMEND" ? { increment: 1 } : undefined,
      },
    });

    // 推薦10で提案化
    if (type === "RECOMMEND") {
      const p = await prisma.post.findUnique({ where: { id: postId } });
      if (p && p.recCount + 1 >= 10 && p.type !== "PROPOSAL") {
        await prisma.post.update({ where: { id: postId }, data: { type: "PROPOSAL" } });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // 一意制約（同一identityの重複）
    if (e.code === "P2002") {
      return NextResponse.json({ ok: false, error: "duplicate" }, { status: 409 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}