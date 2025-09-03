// lib/hash.ts
import * as argon2 from "argon2";

// 入力のゆらぎ吸収（全角/半角スペース、NFKC、連続空白、前後空白）
export function normalizeDeleteKey(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFKC")
    .replace(/\u3000/g, " ")      // 全角スペース → 半角
    .replace(/\s+/g, " ")         // 連続空白を 1 個に
    .trim();
}

// 保存用ハッシュ（必ず正規化してから）
export async function hashDeleteKey(raw: string): Promise<string> {
  const norm = normalizeDeleteKey(raw);
  // パラメータは必要に応じて
  return argon2.hash(norm, {
    type: argon2.argon2id,
    // memoryCost/timeCost/parallelism はデフォルトでもOK
  });
}

/**
 * 検証：
 * 1) 保存値が $argon2... なら argon2.verify(正規化済み入力)
 * 2) そうでなければ「レガシー平文」とみなし、保存値も正規化して素直に比較
 */
export async function verifyDeleteKey(stored: string, input: string): Promise<boolean> {
  if (!stored) return false;
  const norm = normalizeDeleteKey(input);

  if (stored.startsWith("$argon2")) {
    try {
      return await argon2.verify(stored, norm);
    } catch {
      return false;
    }
  }

  // 旧データ(平文)に対応
  return normalizeDeleteKey(stored) === norm;
}