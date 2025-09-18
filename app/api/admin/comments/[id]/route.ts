// app/api/admin/comments/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const action = body?.action;
  if (action !== "REMOVE" && action !== "RESTORE") {
    return NextResponse.json({ ok:false, error:"bad_request" }, { status:400 });
  }

  const data = action === "REMOVE"
    ? { deletedAt: new Date() }
    : { deletedAt: null };

  const r = await prisma.comment.update({
    where: { id: params.id },
    data,
    select: { id: true, deletedAt: true },
  });

  return NextResponse.json({ ok:true, comment: r });
}