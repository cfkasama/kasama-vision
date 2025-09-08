// app/api/intent/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Kind = "LIVE" | "WORK" | "TOURISM";

export async function POST(req: Request) {
  try {
    const { kind, municipalitySlug } = (await req.json()) as {
      kind: Kind;
      municipalitySlug?: string;
    };

    if (!kind || !["LIVE","WORK","TOURISM"].includes(kind)) {
      return NextResponse.json({ ok:false, error:"bad_kind" }, { status:400 });
    }
    if (!municipalitySlug) {
      return NextResponse.json({ ok:false, error:"municipality_required" }, { status:400 });
    }

    const muni = await prisma.municipality.findUnique({ where: { slug: municipalitySlug } });
    if (!muni) {
      return NextResponse.json({ ok:false, error:"municipality_not_found" }, { status:404 });
    }

    const identityId = await getOrCreateIdentityId();

    // 既存チェック（同一 identity × municipality × kind で1回だけ）
    const exists = await prisma.intent.findFirst({
      where: { identityId, municipalityId: muni.id, kind }
    });
    if (exists) {
      return NextResponse.json({ ok:false, error:"already_pressed" }, { status:409 });
    }

    await prisma.intent.create({
      data: { identityId, municipalityId: muni.id, kind }
    });

    return NextResponse.json({ ok:true });
  } catch (e) {
    console.error("[POST /api/intent] err:", e);
    return NextResponse.json({ ok:false, error:"internal_error" }, { status:500 });
  }
}

// GET /api/intent?municipality=slug
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("municipality");
    if (!slug) {
      return NextResponse.json({ ok:false, error:"municipality_required" }, { status:400 });
    }

    const muni = await prisma.municipality.findUnique({ where: { slug } });
    if (!muni) {
      return NextResponse.json({ ok:false, error:"municipality_not_found" }, { status:404 });
    }

    const rows = await prisma.intent.groupBy({
      by: ["kind"],
      where: { municipalityId: muni.id },
      _count: { _all: true },
    });

    const map = Object.fromEntries(rows.map(r => [r.kind, r._count._all]));
    return NextResponse.json({
      ok: true,
      counts: {
        live: map.LIVE ?? 0,
        work: map.WORK ?? 0,
        tourism: map.TOURISM ?? 0,
      },
    });
  } catch (e) {
    console.error("[GET /api/intent] err:", e);
    return NextResponse.json({ ok:false, error:"internal_error" }, { status:500 });
  }
}