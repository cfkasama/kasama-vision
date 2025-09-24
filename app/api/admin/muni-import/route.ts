// app/api/admin/muni-import/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ★必要ならここで管理者チェック（NextAuthなど）
// 例: セッションの isAdmin を見る or ヘッダで簡易保護
function assertAdmin(req: Request) {
  const key = process.env.ADMIN_SECRET;
  if (!key) return; // 設定なしならスキップ（開発用）
  const got = req.headers.get("x-admin-secret");
  if (got !== key) throw new Error("unauthorized");
}

// 超軽量 CSV パーサ（ダブルクォート対応・最小限）
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0, f = "", row: string[] = [], q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { f += '"'; i += 2; continue; }
        q = false; i++; continue;
      }
      f += c; i++; continue;
    } else {
      if (c === '"') { q = true; i++; continue; }
      if (c === ",") { row.push(f); f = ""; i++; continue; }
      if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      f += c; i++; continue;
    }
  }
  row.push(f); rows.push(row);
  // 末尾の空行除去
  return rows.filter(r => r.length && r.some(c => c.trim() !== ""));
}

type Row = { name: string; slug: string; prefecture?: string | null; code?: string | null };

function normalizeHeader(h: string) {
  return h.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    assertAdmin(req);

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const mode = String(form.get("mode") ?? "upsert"); // "upsert" | "replace"
    if (!file) {
      return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });
    }

    // 文字コード: UTF-8想定。Shift_JISなら iconv-lite を使う（後述）
    const buf = Buffer.from(await file.arrayBuffer());
    let text = buf.toString("utf8");

    const rows = parseCSV(text);
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "empty_csv" }, { status: 400 });
    }

    // ヘッダ検証
    const header = rows[0].map(normalizeHeader);
    const idxName = header.indexOf("name");
    const idxSlug = header.indexOf("slug");
    const idxPref = header.indexOf("prefecture");
    const idxCode = header.indexOf("code");
    if (idxName < 0 || idxSlug < 0 || idxPref < 0 || idxCode < 0) {
      return NextResponse.json({ ok: false, error: "bad_header_expected_name_slug_prefecture_code" }, { status: 400 });
    }

    // replace の場合は全削除してから（注意: 本番でやると関連テーブルに外部キー影響あり）
    if (mode === "replace") {
      await prisma.$executeRawUnsafe(`DELETE FROM "Municipality";`);
    }

    // 行を整形
    const data: Row[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      // 列数不足に緩く対応
      const name = (r[idxName] ?? "").trim();
      const slug = (r[idxSlug] ?? "").trim();
      const prefecture = (r[idxPref] ?? "").trim() || null;
      const code = (r[idxCode] ?? "").trim() || null;
      if (!name || !slug) continue;
      data.push({ name, slug, prefecture, code });
    }
    if (!data.length) {
      return NextResponse.json({ ok: false, error: "no_rows" }, { status: 400 });
    }

    // まとめて upsert（ユニーク: slug）
    // 量が多いのでチャンク実行（例: 500件ずつ）
    const chunkSize = 500;
    let created = 0, updated = 0;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await prisma.$transaction(
        chunk.map((r) =>
          prisma.municipality.upsert({
            where: { slug: r.slug },
            update: { name: r.name, prefecture: r.prefecture, code: r.code },
            create: { name: r.name, slug: r.slug, prefecture: r.prefecture, code: r.code },
            select: { id: true }, // 軽量化
          })
        )
      );
      // created/updated を正確に計測したい場合は upsert前に findUnique などで存在確認する
      // ここでは件数のみ返す簡易版
    }

    // 件数サマリ（簡易）
    const total = data.length;
    return NextResponse.json({ ok: true, total, mode });
  } catch (e: any) {
    const msg = e?.message || "internal_error";
    const code = msg === "unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
