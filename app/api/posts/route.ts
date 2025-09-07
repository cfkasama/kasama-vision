// app/api/posts/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { hashDeleteKey } from "@/lib/hash";
import { getOrCreateIdentityId } from "@/lib/identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

// 🔧 これが無くなっていたので復活させる
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
};

// 既存の GET はそのまま

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePostBody & { municipalitySlug?: string };

    const { type, title, deleteKey, recaptchaToken, municipalitySlug } = body;
    const content = body.content ?? "";
    const tags = (body.tags ?? []).map(s => s.trim()).filter(Boolean).slice(0, 5);

    if (!type || !title || !deleteKey || !recaptchaToken) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ ok: false, error: "title_too_long" }, { status: 400 });
    }

    const recaptchaOk = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaOk) {
      return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });
    }

    const hashed = await hashDeleteKey(deleteKey);
    const identityId = await getOrCreateIdentityId();

    // 自治体の確定（slug 指定なければ "all" を利用・なければ作成）
    let municipalityId: string;
    if (municipalitySlug) {
      const m = await prisma.municipality.findUnique({ where: { slug: municipalitySlug } });
      if (!m) return NextResponse.json({ ok: false, error: "municipality_not_found" }, { status: 404 });
      municipalityId = m.id;
    } else {
      const globalSlug = "all";
      let m = await prisma.municipality.findUnique({ where: { slug: globalSlug } });
      if (!m) {
        m = await prisma.municipality.create({ data: { slug: globalSlug, name: "全国" } });
      }
      municipalityId = m.id;
    }

    const post = await prisma.post.create({
      data: {
        type,
        title,
        content,
        deleteKey: hashed,
        identityId,
        municipalityId, // ← 必須
      },
    });

    for (const name of tags) {
      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
    }

    return NextResponse.json({ ok: true, id: post.id });
  } catch (err) {
    console.error("[POST /api/posts] error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}