// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const PatchSchema = z.object({
  // いずれか指定：days（期間） / until（ISO） / unlock（解除）
  days: z.number().int().positive().max(365).optional(),
  until: z.string().datetime().optional(),
  unlock: z.boolean().optional(),
  reason: z.string().max(500).optional(),
}).refine(v => v.days || v.until || v.unlock, { message: "no_change" });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const p = PatchSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ ok:false, error:"bad_request" }, { status:400 });

  const data: any = {};
  if (p.data.unlock) {
    data.lockedUntil = null;
    data.lockedReason = null;
  } else {
    const until = p.data.until
      ? new Date(p.data.until)
      : new Date(Date.now() + p.data.days! * 24 * 60 * 60 * 1000);
    data.lockedUntil = until;
    if (p.data.reason !== undefined) data.lockedReason = p.data.reason || null;
  }

  await prisma.identity.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok:true });
}