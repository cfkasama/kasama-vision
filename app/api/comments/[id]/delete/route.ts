import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeleteKey, hashDeleteKey } from "@/lib/hash"; // レガシー平文→その場で再ハッシュする場合に備え

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// POST /api/comments/:id/delete  { deleteKey: "xxxxx" }
export async function POST(req: Request, { params }: Params) {
  const { id } = params;
  if (!id) return NextResponse.json({ ok:false, error:"bad_request" }, { status:400 });

  let deleteKeyPlain = "";
  try {
    const body = await req.json();
    deleteKeyPlain = String(body?.deleteKey ?? "").trim();
  } catch {
    return NextResponse.json({ ok:false, error:"bad_json" }, { status:400 });
  }
  if (!deleteKeyPlain) {
    return NextResponse.json({ ok:false, error:"key_required" }, { status:400 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id:true, postId:true, deleteKey:true, deletedAt:true }
  });
  if (!comment) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });
  if (comment.deletedAt) return NextResponse.json({ ok:true }); // すでに削除済みはOK扱い
  if (!comment.deleteKey) {
    return NextResponse.json({ ok:false, error:"no_delete_key" }, { status:403 });
  }

  // ★ 引数順を「平文, ハッシュ(or平文)」に
  const valid = await verifyDeleteKey(comment.deleteKey,deleteKeyPlain);
  if (!valid) return NextResponse.json({ ok:false, error:"invalid_key" }, { status:403 });

  // （任意）レガシー平文で保存されていた場合は、このタイミングで再ハッシュして上書き
  if (!comment.deleteKey.startsWith?.("$argon2")) {
    try {
      const newHash = await hashDeleteKey(deleteKeyPlain);
      await prisma.comment.update({ where: { id }, data: { deleteKey: newHash } });
    } catch (_) {
      /* ここは致命ではないので握りつぶしでもOK */
    }
  }

  // 原子性を確保するならトランザクションにまとめる
  await prisma.$transaction([
    prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() }
    }),
    // cmtCount が負にならないようにガード（0未満にしない）
    prisma.post.update({
      where: { id: comment.postId },
      data: { cmtCount: { decrement: 1 } }
    })
  ]).catch(async () => {
    // decrement が負になり得る場合の保険（DBでCHECK制約が無い前提）
    const p = await prisma.post.findUnique({ where: { id: comment.postId }, select: { cmtCount: true } });
    if (p && p.cmtCount < 0) {
      await prisma.post.update({ where: { id: comment.postId }, data: { cmtCount: 0 } });
    }
  });

  return NextResponse.json({ ok:true });
}
