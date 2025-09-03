// app/api/posts/[id]/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyDeleteKey } from "@/lib/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  let inputKey = "";
  try {
    const body = await req.json();
    inputKey = String(body?.deleteKey ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  if (!inputKey) {
    return NextResponse.json({ ok: false, error: "deleteKey_required" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, deleteKey: true, status: true },
  });
  if (!post) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!post.deleteKey) {
    return NextResponse.json({ ok: false, error: "deleteKey_not_set" }, { status: 403 });
  }

  // ★ verifyDeleteKey 側で normalize 済み
  const ok = await verifyDeleteKey(post.deleteKey, inputKey);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "invalid_deleteKey" }, { status: 403 });
  }

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

  await prisma.adminLog.create({
    data: {
      action: "REMOVE_POST",
      actor: "public:self",
      target: `post:${post.id}`,
      note: "deleted by deleteKey",
      postId: post.id,
    },
  }).catch((e) => console.warn("[post delete] adminLog failed:", e));

  return NextResponse.json({ ok: true });
}