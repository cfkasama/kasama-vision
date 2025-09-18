// app/api/posts/route.ts（POSTの中身のみ差し替え/調整）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { hashDeleteKey } from "@/lib/hash";
import { getOrCreateIdentityId } from "@/lib/identity";
import { assertNotLocked } from "@/lib/identity";

type CreatePostBody = {
  type:
    | "CATCHPHRASE"
    | "VISION"
    | "CONSULTATION"
    | "PROPOSAL"
    | "REPORT_LIVE"
    | "REPORT_WORK"
    | "REPORT_TOURISM";
  title: string;
  content?: string;
  tags?: string[];
  deleteKey: string;
  recaptchaToken: string;
  municipalitySlug: string; // ← 追加（必須）
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePostBody;

    const { type, title, deleteKey, recaptchaToken, municipalitySlug } = body;
    const content = body.content ?? "";
    const tags = (body.tags ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (!type || !title || !deleteKey || !recaptchaToken || !municipalitySlug) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ ok: false, error: "title_too_long" }, { status: 400 });
    }

    // reCAPTCHA
    const recaptchaOk = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaOk) {
      return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });
    }

    // 自治体の解決
    const municipality = await prisma.municipality.findUnique({
      where: { slug: municipalitySlug },
      select: { id: true },
    });
    if (!municipality) {
      return NextResponse.json({ ok: false, error: "municipality_not_found" }, { status: 404 });
    }

    // キーのハッシュ化 & 投稿者識別
    const hashed = await hashDeleteKey(deleteKey);
    const identityId = await getOrCreateIdentityId();
  await assertNotLocked(identityId); // ← ここでロック中なら即 403
    
    // 作成
    const post = await prisma.post.create({
      data: {
        municipalityId: municipality.id, // ← 必須
        type,
        title,
        content,
        deleteKey: hashed,
        identityId,
        // status はデフォルト(PUBLISHED)
      },
      select: { id: true },
    });

    // タグ upsert
    for (const name of tags) {
      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
        select: { id: true },
      });
      await prisma.postTag.create({
        data: { postId: post.id, tagId: tag.id },
      });
    }

    return NextResponse.json({ ok: true, id: post.id });
  } catch (err) {
    console.error("[POST /api/posts] error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
