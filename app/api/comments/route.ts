import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";

export async function POST(req: Request) {
  const { postId, content } = await req.json();
  const identityId = await getOrCreateIdentityId();
  const c = await prisma.comment.create({ data: { postId, content, identityId }});
  await prisma.post.update({ where:{ id: postId }, data:{ cmtCount: { increment: 1 } }});
  return NextResponse.json({ ok:true, id: c.id });
}
