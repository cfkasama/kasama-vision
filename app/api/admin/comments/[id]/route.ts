// app/api/admin/comments/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const PatchSchema = z.object({
  action: z.enum(["REMOVE", "RESTORE"]),
}).strict();

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const p = PatchSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const data = p.data.action === "REMOVE"
    ? { status: "REMOVED" as const }
    : { status: "PUBLISHED" as const };

  const r = await prisma.comment.update({
    where: { id: params.id },
    data,
    select: { id: true, status: true },
  });

  return NextResponse.json({ ok: true, comment: r });
}
