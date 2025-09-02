// lib/password.ts
import { hash as aHash, verify as aVerify } from "@node-rs/argon2";
import crypto from "crypto";

// パラメータは安全寄りに（コストは環境で微調整）
const ARGON_OPTS = {
  memoryCost: 19456, // ~19MB
  timeCost: 2,
  parallelism: 1,
};

// ハッシュ化
export async function hashDeleteKey(plain: string) {
  // サーバ側でランダムソルト（ライブラリ内でも付くが念のため）
  const salt = crypto.randomBytes(16);
  const h = await aHash(plain, {
    ...ARGON_OPTS,
    salt,
    hashLength: 32,
    variant: 2, // Argon2id
  });
  return h; // 例: $argon2id$v=19$m=...,t=...,p=...$...
}

// 照合（レガシー平文も救済）
export async function verifyDeleteKey(input: string, stored: string | null) {
  if (!stored) return false;
  // すでにハッシュなら verify
  if (stored.startsWith("$argon2id$")) {
    try { return await aVerify(stored, input); }
    catch { return false; }
  }
  // レガシー（平文）対応：完全一致なら OK（ヒット時は呼び出し側で再ハッシュ更新推奨）
  return input === stored;
}