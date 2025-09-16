import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateIdentityId } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set(["LIVE", "WORK", "TOURISM"]);

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** POST /api/intent
 *  body: { kind: "LIVE"|"WORK"|"TOURISM", mslug: string }
 *  409: 同一 identity × municipality × kind は一度だけ
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad(400, "bad_json");
  }

  const kind = String(body?.kind ?? "").toUpperCase();
  // 後方互換: mslug / municipalitySlug / slug のいずれでもOKに
  const mslug = String(body?.mslug ?? body?.municipalitySlug ?? body?.slug ?? "").trim();

  if (!VALID.has(kind) || !mslug) {
    return bad(400, "bad_request");
  }

  // slug → municipalityId 解決
  const muni = await prisma.municipality.findUnique({
    where: { slug: mslug },
    select: { id: true },
  });
  if (!muni) return bad(404, "municipality_not_found");

  const identityId = await getOrCreateIdentityId();

  try {
    await prisma.intent.create({
      data: {
        kind: kind as any,          // Prisma enum
        identityId,
        municipalityId: muni.id,    // ★ slug ではなく id で保存
      },
    });

  const field =
    kind === "LIVE" ? "liveCount" :
    kind === "WORK" ? "workCount" : "tourismCount";

  const field2 =
    kind === "LIVE" ? "liveCountMonthly" :
    kind === "WORK" ? "workCountMonthly" : "tourismCountMonthly";
    
  await prisma.municipality.update({
    where: { id: muni.id },
    data: { [field]: { increment: 1 }, [field2]: { increment: 1 } },
  });
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // 一意制約違反（すでに押している）
    if (e?.code === "P2002") {
      return bad(409, "already_pressed");
    }
    console.error("[POST /api/intent] error:", e);
    return bad(500, "internal_error");
  }
}

/** GET /api/intent?mslug=xxx
 *  → { ok:true, counts: { live, work, tourism } }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mslug = searchParams.get("mslug")?.trim();
  if (!mslug) return bad(400, "bad_request");

  const muni = await prisma.municipality.findUnique({
    where: { slug: mslug },
    select: { id: true },
  });
  if (!muni) return bad(404, "municipality_not_found");

  const rows = await prisma.intent.groupBy({
    by: ["kind"],
    where: { municipalityId: muni.id }, // ★ id で絞り込み
    _count: { _all: true },
  });

  const counts = { live: 0, work: 0, tourism: 0 };
  for (const r of rows) {
    if (r.kind === "LIVE") counts.live = r._count._all;
    if (r.kind === "WORK") counts.work = r._count._all;
    if (r.kind === "TOURISM") counts.tourism = r._count._all;
  }

  return NextResponse.json({ ok: true, counts });
}
