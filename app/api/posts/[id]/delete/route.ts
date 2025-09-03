// app/api/posts/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeleteKey, hashDeleteKey } from "@/lib/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // 入力取得
  let inputKey = "";
  try {
    const body = await req.json();
    inputKey = String(body?.deleteKey ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  if (!inputKey) {
    return NextResponse.json({ ok: false, error: "deleteKey_required" }, { status: 400 });
  }

  // 対象ポスト取得
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, deleteKey: true, status: true },
  });
  if (!post) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // deleteKey が未設定の古いデータ
  if (!post.deleteKey) {
    return NextResponse.json(
      { ok: false, error: "deleteKey_not_set" },
      { status: 403 }
    );
  }

  // ハッシュ or 平文の判定（簡易）
  const isHashed = post.deleteKey.startsWith("$argon2");

  let ok = false;
  if (isHashed) {
    // 既にハッシュ化済み
    ok = await verifyDeleteKey(post.deleteKey, inputKey);
  } else {
    // レガシー平文（完全一致）
    ok = post.deleteKey === inputKey;
  }

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_deleteKey" },
      { status: 403 }
    );
  }

  // レガシー平文だった場合は、このタイミングでハッシュへ置換（将来の安全性UP）
  if (!isHashed) {
    try {
      const newHash = await hashDeleteKey(inputKey);
      await prisma.post.update({
        where: { id: post.id },
        data: { deleteKey: newHash },
      });
    } catch (e) {
      // ここでの失敗は致命ではないので握りつぶす（削除自体は続行）
      console.warn("[post delete] rehash failed:", e);
    }
  }

  // 論理削除（復元可能にしておく）
  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: "REMOVED",
      // 必要なら可視性フラグも落とす:
      tempHiddenActive: true,
      tempHiddenAt: new Date(),
      lowExposureActive: true,
      lowExposureAt: new Date(),
    },
  });

  // 管理ログ
  try {
    await prisma.adminLog.create({
      data: {
        action: "REMOVE_POST",
        actor: "public:self", // 必要に応じて識別子を変える
        target: `post:${post.id}`,
        note: "deleted by deleteKey",
        postId: post.id,
      },
    });
  } catch (e) {
    console.warn("[post delete] adminLog failed:", e);
  }

  return NextResponse.json({ ok: true });
}
