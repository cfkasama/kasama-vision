// app/api/report/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/report
 * body: {
 *   postId: string;                 // 必須
 *   reason?: "POST" | "COMMENT" | string; // 任意（デフォルト "POST"）
 *   note?: string;                  // 任意（自由記述）
 *   meta?: any;                     // 任意（{ commentId: string } など）
 * }
 */
export async function POST(req: Request) {
  // ---- 入力の安全なパース ----
  let postId = "";
  let reason = "POST";
  let note = "";
  let meta: any = null;

  try {
    const body = await req.json();
    postId = String(body?.postId ?? "");
    reason = body?.reason ? String(body.reason) : "POST";
    note   = body?.note ? String(body.note) : "";
    meta   = body?.meta ?? null;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!postId) {
    return NextResponse.json({ ok: false, error: "post_id_required" }, { status: 400 });
  }

  try {
    // ---- 投稿の存在確認 ----
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });

    // ---- 匿名IDをできるだけ付与 ----
    const jar = cookies();
    const cookieKey = "iid";
    let identityId: string | null = null;

    const cookieVal = jar.get(cookieKey)?.value;
    if (cookieVal) {
      const found = await prisma.identity.findUnique({ where: { id: cookieVal }, select: { id: true } });
      if (found) {
        identityId = found.id;
      } else {
        const created = await prisma.identity.create({ data: {} , select: { id: true }});
        identityId = created.id;
        jar.set(cookieKey, created.id, {
          httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365,
        });
      }
    } else {
      const created = await prisma.identity.create({ data: {} , select: { id: true }});
      identityId = created.id;
      jar.set(cookieKey, created.id, {
        httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365,
      });
    }

    // ---- 通報レコード作成（コメント通報は meta に commentId を入れてOK）----
    await prisma.abuseReport.create({
      data: { postId, reason, note, identityId },
    });

    // ---- 過去24hのユニーク通報者数で可視性フラグ切替 ----
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const reports = await prisma.abuseReport.findMany({
      where: { postId, createdAt: { gte: since } },
      select: { identityId: true },
    });

    const uniques = new Set(reports.map(r => r.identityId || "anon")).size;

    const current = await prisma.post.findUnique({
      where: { id: postId },
      select: { lowExposureActive: true, tempHiddenActive: true },
    });

    if (uniques >= 3 && !current?.lowExposureActive) {
      await prisma.post.update({
        where: { id: postId },
        data: { lowExposureActive: true, lowExposureAt: new Date() },
      });
    }

    if (uniques >= 5 && !current?.tempHiddenActive) {
      await prisma.post.update({
        where: { id: postId },
        data: { tempHiddenActive: true, tempHiddenAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, uniques });
  } catch (e: any) {
    console.error("[POST /api/report] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}