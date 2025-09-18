// app/api/admin/users/route.ts  （GET）
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request){
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const ids = await prisma.identity.findMany({
    where: q ? { id: { contains: q } } : {},
    select: { id:true, lockedUntil:true, lockedReason:true, createdAt:true },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  // 簡易集計（必要に応じて最適化OK）
  const users = await Promise.all(ids.map(async u=>{
    const [posts, comments] = await Promise.all([
      prisma.post.count({ where: { identityId: u.id } }),
      prisma.comment.count({ where: { identityId: u.id } }),
    ]);
    return {
      id: u.id,
      lockedUntil: u.lockedUntil,
      lockedReason: u.lockedReason,
      lastActive: u.createdAt, // 適宜置換
      posts, comments,
    };
  }));

  return NextResponse.json({ ok:true, users });
}