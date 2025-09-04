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

    // 端末の匿名ID（なければ作成）
    const identityId = await getOrCreateIdentityId();

    // IPも一応メモ（任意）
    const ip =
      (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "")
        .split(",")[0]
        .trim() || null;

    await prisma.adminLog.create({
      data: {
        action: MAP[kind],
        actor: `public:${ip ?? "unknown"}`,
        target: "intent",
        note: null,
        postId: null,
        meta: { identityId, ip },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/intent] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}