import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { AbusePostIdRow } from "@/types/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { action, reportIds, note } = await req.json();
  const resolver = session.user?.email || "admin";

  if (action === "DISMISS") {
    await prisma.abuseReport.updateMany({
      where: { id: { in: reportIds } },
      data: { status: "DISMISSED", resolvedAt: new Date(), resolver, note },
    });
  } else if (action === "REMOVE_POST" || action === "RESTORE_POST") {
    const rep = (await prisma.abuseReport.findMany({
      where: { id: { in: reportIds } },
      select: { postId: true },
    })) as AbusePostIdRow[];

    const ids = [...new Set(rep.map((r: AbusePostIdRow) => r.postId))];

    await prisma.post.updateMany({
      where: { id: { in: ids } },
      data: { status: action === "REMOVE_POST" ? "REMOVED" : "PUBLISHED" },
    });

    await prisma.abuseReport.updateMany({
      where: { id: { in: reportIds } },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolver, note },
    });
  }

  return NextResponse.json({ ok: true });
}