import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/abuse
// body: { postId: string; reason?: string; note?: string; meta?: any }
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const postId = String(body?.postId ?? "");
  const reason = body?.reason ? String(body.reason) : null; // 例: "COMMENT"
  const note   = body?.note ? String(body.note).slice(0, 2000) : null;
  const meta   = body?.meta ?? null; // { commentId: "..." } など

  if (!postId) {
    return NextResponse.json({ ok: false, error: "post_id_required" }, { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
    }

    await prisma.abuseReport.create({
      data: {
        postId,
        reason: reason ?? undefined,
        note: note ?? undefined,
        meta: meta ?? undefined,     // 👈 schema に meta を追加している前提
        identityId: null,            // 匿名
        // status は @default(OPEN)
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /api/abuse] error:", e);
    // meta が無い場合の典型エラー: Unknown arg `meta` in data
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
