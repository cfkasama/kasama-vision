// app/api/intent/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = { kind: "LIVE" | "WORK" | "TOURISM" };
const MAP: Record<Body["kind"], string> = {
  LIVE: "INTENT_LIVE",
  WORK: "INTENT_WORK",
  TOURISM: "INTENT_TOURISM",
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const kind = body?.kind;
    if (!kind || !MAP[kind]) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    // 匿名ID（Cookieベース）を取得/作成
    const identityId = await getOrCreateIdentityId();
    const actor = `identity:${identityId}`;

    // 既に同じ identityId が同じ intent を押していないかチェック
    const exists = await prisma.adminLog.findFirst({
      where: { action: MAP[kind], actor },
      select: { id: true },
    });
    if (exists) {
      // すでに押している → 409
      return NextResponse.json({ ok: false, error: "already_pressed" }, { status: 409 });
    }

    // ログ追加（集計は adminLog の groupBy のままでOK）
    await prisma.adminLog.create({
      data: {
        action: MAP[kind],
        actor,                     // identity で固定
        target: "intent",
        note: null,
        postId: null,
        meta: {},                 // 必要なら追加情報
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/intent] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}