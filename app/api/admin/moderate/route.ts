import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeAdminLog } from "@/lib/audit";

type ModerateBody = {
  action: "REMOVE" | "REALIZE" | "RESTORE";
  postIds: string[];
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const { action, postIds } = (await req.json()) as ModerateBody;

  if (!Array.isArray(postIds) || postIds.length === 0) {
    return NextResponse.json({ ok: false, error: "no_ids" }, { status: 400 });
  }

  if (action === "REMOVE") {
    await prisma.post.updateMany({ where: { id: { in: postIds } }, data: { status: "REMOVED" } });
  } else if (action === "REALIZE") {
    await prisma.post.updateMany({
      where: { id: { in: postIds } },
      data: { status: "REALIZED", realizedAt: new Date() },
    });
  } else if (action === "RESTORE") {
    await prisma.post.updateMany({ where: { id: { in: postIds } }, data: { status: "PUBLISHED" } });
  } else {
    return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  await writeAdminLog({
    actor: (session as any).login ?? session.user?.email ?? "admin",
    action,
    targetType: "POST",
    targetId: postIds,
    meta: { count: postIds.length },
  });

  return NextResponse.json({ ok: true });
}
