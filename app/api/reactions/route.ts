import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";

export async function POST(req: Request) {
  const { postId, type } = await req.json();
  const identityId = await getOrCreateIdentityId();
  try {
    await prisma.reaction.create({ data: { postId, identityId, type }});
    await prisma.post.update({
      where: { id: postId },
      data: {
        likeCount: type==="LIKE" ? { increment: 1 } : undefined,
        recCount:  type==="RECOMMEND" ? { increment: 1 } : undefined,
      }
    });
    if (type==="RECOMMEND") {
      const p = await prisma.post.findUnique({ where: { id: postId }});
      if (p && p.recCount + 1 >= 10 && p.type !== "PROPOSAL") {
        await prisma.post.update({ where: { id: postId }, data: { type: "PROPOSAL" }});
      }
    }
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    if (e.code === "P2002") return NextResponse.json({ ok:false, error:"duplicate" }, { status: 409 });
    return NextResponse.json({ ok:false }, { status: 500 });
  }
}
