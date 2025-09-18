import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { locked } = await req.json();
  await prisma.identity.update({
    where: { id: params.id },
    data: { locked: !!locked },
  });
  return NextResponse.json({ ok: true });
}
