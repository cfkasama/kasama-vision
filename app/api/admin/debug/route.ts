// app/api/admin/debug-session/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  const s = await getServerSession(authOptions);
  return NextResponse.json({ ok: true, session: s ?? null });
}
