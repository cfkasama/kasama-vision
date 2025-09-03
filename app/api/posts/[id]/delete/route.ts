// app/api/posts/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeleteKey, hashDeleteKey, normalizeDeleteKey } from "@/lib/hash";

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
    inputKey = String(body?.deleteKey ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  // ★ 正規化（全角/半角・連続空白・前後空白 揃える）
  const inputKeyNorm = normalizeDeleteKey(inputKey);
  if (!inputKeyNorm) {
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

  if (!post.deleteKey) {
    // すごく古いデータで deleteKey 未設定
    return NextResponse.json({ ok: false, error: "deleteKey_not_set" }, { status: 403 });
  }

  const isArgon2 = post.deleteKey.startsWith("$argon2");
  let ok = false;

  if (isArgon2) {
    // ★ ハッシュ検証時も「正規化済みの入力」を渡す
    ok = await verifyDeleteKey(post.deleteKey, inputKeyNorm);
  } else {
    // ★ レガシー平文は「保存値・入力値ともに正規化して比較」
    ok = normalizeDeleteKey(post.deleteKey) === inputKeyNorm;
  }

  if (!ok) {
    return NextResponse.json({ ok: false, error: "invalid_deleteKey" }, { status: 403 });
  }

  // ★ レガシー平文だったら、ここで再ハッシュ置換（将来の安全性UP）
  if (!isArgon2) {
    try {
      const newHash = await hashDeleteKey(inputKeyNorm);
      await prisma.post.update({
        where: { id: post.id },
        data: { deleteKey: newHash },
      });
    } catch (e) {
      console.warn("[post delete] rehash failed:", e);
    }
  }

  // 論理削除（復元可能）
  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: "REMOVED",
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
        actor: "public:self",
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