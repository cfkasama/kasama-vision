// app/api/admin/moderate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeAdminLog } from "@/lib/audit";

// 重要: NextAuth は Node ランタイムで
export const runtime = "nodejs";

type Action = "REMOVE" | "REALIZE" | "RESTORE";

function bad(status: number, error: string, extra?: any) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function POST(req: Request) {
  // --- 認証 ---
  const session = await getServerSession(authOptions);
  if (!session) return bad(401, "unauthorized");

  // 任意: 管理者チェック入れるならここで
  // if (!session.user?.email?.endsWith("@your-domain")) return bad(403, "forbidden");

  // --- 入力 ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad(400, "bad_json");
  }

  const action = (body as any)?.action as Action;
  const postIds = (body as any)?.postIds as unknown;

  if (action !== "REMOVE" && action !== "REALIZE" && action !== "RESTORE") {
    return bad(400, "bad_action", { action });
  }
  if (!Array.isArray(postIds) || postIds.length === 0) {
    return bad(400, "no_ids");
  }
  // 文字列IDのみ許可
  const ids: string[] = postIds.filter((x: any) => typeof x === "string" && x.trim());
  if (ids.length !== postIds.length) {
    return bad(400, "bad_id_list");
  }

  // --- DB 更新 ---
  try {
    if (action === "REMOVE") {
      await prisma.post.updateMany({
        where: { id: { in: ids } },
        data: { status: "REMOVED" }, // Prisma enum に一致
      });
    } else if (action === "REALIZE") {
      await prisma.post.updateMany({
        where: { id: { in: ids } },
        data: { status: "REALIZED", realizedAt: new Date() },
      });
    } else {
      await prisma.post.updateMany({
        where: { id: { in: ids } },
        data: { status: "PUBLISHED" },
      });
    }
  } catch (e) {
    console.error("[moderate] updateMany failed:", e);
    return bad(500, "db_update_failed");
  }

  // --- 監査ログ（失敗しても本処理は成功扱いにする）---
  try {
    await writeAdminLog({
      actor: (session as any).login ?? session.user?.email ?? "admin",
      action,
      // targetId が string[] を受けられないなら実装に合わせて targetIds へ
      targetId: ids,
      meta: { count: ids.length },
    });
  } catch (e) {
    // 監査ログは握りつぶし（エラーは記録だけ）
    console.warn("[moderate] writeAdminLog failed:", e);
  }

  return NextResponse.json({ ok: true, count: ids.length, action });
}