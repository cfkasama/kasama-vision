import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const reports = await prisma.abuseReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          type: true,
          likeCount: true,
          recCount: true,
          cmtCount: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, reports });
}