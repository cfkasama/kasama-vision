import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request){
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const identities = await prisma.identity.findMany({
    where: q ? { id: { contains: q } } : {},
    select: { id:true, locked:true, createdAt:true },
    take: 100,
  });

  const users = await Promise.all(identities.map(async u=>{
    const [posts, comments] = await Promise.all([
      prisma.post.count({ where: { identityId: u.id } }),
      prisma.comment.count({ where: { identityId: u.id } }),
    ]);
    return { id: u.id, locked: u.locked, posts, comments, lastActive: u.createdAt };
  }));

  return NextResponse.json({ users });
}
