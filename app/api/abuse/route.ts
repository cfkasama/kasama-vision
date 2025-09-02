import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 通報を受け付ける
// body: { postId: string, reason?: string, note?: string, meta?: any }
export async function POST(req: Request) {
  let postId = "";
  let reason = "OTHER";
  let note = "";
  let meta: any = null;

  try {
    const body = await req.json();
    postId = String(body?.postId ?? "");
    reason = body?.reason ? String(body.reason) : "OTHER";
    note   = body?.note ? String(body.note) : "";
    meta   = body?.meta ?? null;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!postId) {
    return NextResponse.json({ ok: false, error: "post_id_required" }, { status: 400 });
  }

  try {
    // 投稿の存在をチェック（通報対象の整合性担保）
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
    }

    // 可能なら identityId を付与する（匿名でもOK）
    const jar = cookies();
    const cookieKey = "iid"; // 端末内の匿名ID
    let identityId: string | null = null;

    const cookieVal = jar.get(cookieKey)?.value;
    if (cookieVal) {
      // 既存クッキーがDBに存在するか軽く確認（なければ新規発行）
      const found = await prisma.identity.findUnique({ where: { id: cookieVal }, select: { id: true } });
      if (found) {
        identityId = found.id;
      } else {
        const created = await prisma.identity.create({ data: {} , select: { id: true }});
        identityId = created.id;
        jar.set(cookieKey, created.id, {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 60 * 60 * 24 * 365, // 1年
        });
      }
    } else {
      const created = await prisma.identity.create({ data: {} , select: { id: true }});
      identityId = created.id;
      jar.set(cookieKey, created.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    // 通報を登録（identityId は null でもOKな設計だが、上で極力付ける）
    await prisma.abuseReport.create({
      data: {
        postId,
        reason,          // 例: "COMMENT" | "POST" | "SPAM" | ...
        note,            // ユーザー自由記述
        meta,            // 例: { commentId: "..." } など
        identityId,      // 可能なら紐づく
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /api/abuse] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}