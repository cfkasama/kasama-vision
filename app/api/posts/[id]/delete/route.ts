import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeleteKey, hashDeleteKey } from "@/lib/password";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const { id } = params;
  if (!id) return NextResponse.json({ ok:false, error:"bad_request" }, { status:400 });

  let inputKey = "";
  try {
    const body = await req.json();
    inputKey = String(body?.deleteKey ?? "");
  } catch {
    return NextResponse.json({ ok:false, error:"bad_json" }, { status:400 });
  }
  if (!inputKey) {
    return NextResponse.json({ ok:false, error:"deleteKey_required" }, { status:400 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, deleteKey: true },
  });
  if (!post) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });

  const ok = await verifyDeleteKey(inputKey, post.deleteKey);
  if (!ok) return NextResponse.json({ ok:false, error:"invalid_deleteKey" }, { status:403 });

  // レガシー平文を踏んだら、その場で再ハッシュ化して保存（将来の安全性UP）
  if (post.deleteKey && !post.deleteKey.startsWith("$argon2id$")) {
    try {
      const rehashed = await hashDeleteKey(inputKey);
      await prisma.post.update({ where: { id }, data: { deleteKey: rehashed } });
    } catch {/* best-effort */}
  }

  // 論理削除か物理削除かは要件次第（ここでは論理削除にしておく）
  await prisma.post.update({
    where: { id },
    data: { status: "REMOVED" },
  });

  return NextResponse.json({ ok:true });
}