import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeleteKey } from "@/lib/hash";

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

  const valid = await verifyDeleteKey(comment.deleteKey, deleteKeyPlain);
  if (!valid) return NextResponse.json({ ok:false, error:"invalid_key" }, { status:403 });

  await prisma.comment.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  // 親ポストのコメント数をデクリメント（下限0）
  prisma.post.update({
    where: { id: comment.postId },
    data: { cmtCount: { decrement: 1 } }
  }).catch(()=>{ /* 失敗してもスルー */ });

  return NextResponse.json({ ok:true });
}
