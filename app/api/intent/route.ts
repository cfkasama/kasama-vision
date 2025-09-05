import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = { kind: "LIVE" | "WORK" | "TOURISM" };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const kind = body?.kind;
    if (!kind || !["LIVE", "WORK", "TOURISM"].includes(kind)) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const identityId = await getOrCreateIdentityId();

    // 既に押してたら 409（ユニーク制約エラーでも拾う）
    const exists = await prisma.intent.findUnique({
      where: { identityId_kind: { identityId, kind: kind as any } },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json({ ok: false, error: "already_pressed" }, { status: 409 });
    }

    // 追加
    await prisma.intent.create({
      data: { identityId, kind: kind as any },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // ユニーク制約の同時押しなどもここで 409 に変換
    if (String(e?.code) === "P2002") {
      return NextResponse.json({ ok: false, error: "already_pressed" }, { status: 409 });
    }
    console.error("[POST /api/intent] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}