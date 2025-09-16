// app/api/muni-rank/route.ts
import { NextResponse } from "next/server";
import { fetchMunicipalityRanking, type Metric, type Range } from "@/lib/ranking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const metric = (searchParams.get("metric") ?? "live") as Metric;     // live|work|tourism
  const range  = (searchParams.get("range")  ?? "total") as Range;     // total|monthly
  const limit  = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? "100")));

  if (!["live", "work", "tourism"].includes(metric) || !["total", "monthly"].includes(range)) {
    return NextResponse.json({ ok: false, error: "bad_params" }, { status: 400 });
  }

  try {
    const rows = await fetchMunicipalityRanking(metric, range, limit);
    return NextResponse.json({ ok: true, metric, range, rows });
  } catch (e: any) {
    console.error("[GET /api/muni-rank] error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
