// lib/hash.ts
import argon2 from "argon2";

/**
 * 入力パスワードの正規化：
 * - Unicode を NFKC に正規化（全角/半角・互換文字の揺れを吸収）
 * - 前後空白を削除
 * - 連続する空白類（半角/全角含む）を 1 個の半角スペースへ圧縮
 */
export function normalizeDeleteKey(input: string): string {
  if (typeof input !== "string") return "";
  const nfkc = input.normalize("NFKC").trim();
  // 半角/全角スペースやタブなどの連続を1つに
  return nfkc.replace(/[\s\u3000]+/g, " ");
}

// 保存用ハッシュ（必ず正規化してから）
export async function hashDeleteKey(raw: string): Promise<string> {
  const norm = normalizeDeleteKey(raw);
  if (!norm) throw new Error("deleteKey is empty after normalization");
  return argon2.hash(norm, {
    type: argon2.argon2id,
    // 必要ならコスト調整（Vercel/Edgeで重すぎない程度に）
    timeCost: 3,       // デフォルト: 3
    memoryCost: 2 ** 16, // 64MB
    parallelism: 1,
  });
}

// 検証（保存されたハッシュ vs 入力）
// 呼び出し側は生の入力を渡してOK。内部で正規化してから verify します。
export async function verifyDeleteKey(storedHash: string, input: string): Promise<boolean> {
  if (!storedHash) return false;
  const norm = normalizeDeleteKey(input);
  if (!norm) return false;
  return argon2.verify(storedHash, norm);
}

// 参考: ハッシュ形式が argon2 か判定したい時に
export function isArgon2Hash(s: string | null | undefined): boolean {
  return !!s && s.startsWith("$argon2");
}