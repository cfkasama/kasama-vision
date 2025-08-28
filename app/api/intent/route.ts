import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const { type } = await req.json();
  const template = type==="LIVE" ? "笠間に住みたい。困っていること/欲しい情報は…"
               : type==="WORK" ? "笠間で働きたい。ハードル/支援が欲しい点は…"
               : "笠間に行きたい。交通/魅力/不満点は…";
  return NextResponse.json({ ok:true, draftTitle: template, draftTags:[type==="LIVE"?"住めなかった報告":type==="WORK"?"働けなかった報告":"不満がある報告"] });
}
