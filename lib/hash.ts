// lib/hash.ts
import crypto from "node:crypto";

// ========== 正規化 ==========
// 全角/半角のゆらぎ、ゼロ幅文字、前後のスペースなどを揃える
export function normalizeKey(input: string): string {
  let s = input.normalize("NFKC");         // 全角→半角、互換文字揺れ統一
  s = s.trim();                            // 前後のスペース削除
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, ""); // ゼロ幅文字削除
  return s;
}

// ========== PBKDF2 設定 ==========
const ITER = 120_000;
const KEYLEN = 32;
const DIGEST = "sha256";

// ========== ハッシュ化 ==========
export async function hashDeleteKey(plain: string): Promise<string> {
  const norm = normalizeKey(plain);
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(norm, salt, ITER, KEYLEN, DIGEST);
  return `pbkdf2$${DIGEST}$${ITER}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

// ========== 検証 ==========
export async function verifyDeleteKey(inputPlain: string, stored: string): Promise<boolean> {
  // まず正規化して検証
  if (await verifyWithNorm(inputPlain, stored)) return true;

  // 旧データ対応: 正規化せず試す
  if (await verifyWithoutNorm(inputPlain, stored)) return true;

  return false;
}

// 内部処理
function parseStored(stored: string) {
  const [scheme, digest, iterStr, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2") return null;
  return {
    digest,
    iter: Number(iterStr),
    salt: Buffer.from(saltB64, "base64"),
    hash: Buffer.from(hashB64, "base64"),
  };
}

async function verifyWithNorm(inputPlain: string, stored: string) {
  const p = parseStored(stored); if (!p) return false;
  const norm = normalizeKey(inputPlain);
  const derived = crypto.pbkdf2Sync(norm, p.salt, p.iter, p.hash.length, p.digest as any);
  return crypto.timingSafeEqual(derived, p.hash);
}

async function verifyWithoutNorm(inputPlain: string, stored: string) {
  const p = parseStored(stored); if (!p) return false;
  const derived = crypto.pbkdf2Sync(inputPlain, p.salt, p.iter, p.hash.length, p.digest as any);
  return crypto.timingSafeEqual(derived, p.hash);
}