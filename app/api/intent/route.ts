// app/api/intent/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Kind = "LIVE" | "WORK" | "TOURISM";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind ?? "").toUpperCase() as Kind;
    const municipalitySlug: string | undefined = body?.municipalitySlug || undefined;

    if (!["LIVE", "WORK", "TOURISM"].includes(kind)) {
      return NextResponse.json({ ok: false, error: "bad_kind" }, { status: 400 });
    }

    const identityId = await getOrCreateIdentityId();

    // 1) municipalityId を確定（指定がなければ "all" を利用/自動作成）
    let municipalityId: string;
    if (municipalitySlug) {
      const m = await prisma.municipality.findUnique({ where: { slug: municipalitySlug } });
      if (!m) {
        return NextResponse.json({ ok: false, error: "municipality_not_found" }, { status: 404 });
      }
      municipalityId = m.id;
    } else {
      const globalSlug = "all";
      let m = await prisma.municipality.findUnique({ where: { slug: globalSlug } });
      if (!m) {
        m = await prisma.municipality.create({
          data: {
            slug: globalSlug,
            name: "全国",
            // prefecture: null など、スキーマに合わせて必要なら項目を追加
          },
        });
      }
      municipalityId = m.id;
    }

    // 2) 二重押し防止（同一 identity × 同一自治体 × 同一 kind）
    const already = await prisma.intent.findFirst({
      where: { identityId, municipalityId, kind },
      select: { id: true },
    });
    if (already) {
      return NextResponse.json({ ok: false, error: "already_pressed" }, { status: 409 });
    }

    // 3) 追加
    await prisma.intent.create({
      data: { identityId, municipalityId, kind: kind as any },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /api/intent] error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}