// lib/password.ts  (server only)
import "server-only";
import argon2 from "argon2";

// 失敗時に false を返す・空文字ガード付き
export async function hashDeleteKey(plain: string): Promise<string> {
  if (!plain) throw new Error("deleteKey is empty");
  // 推奨: argon2id
  return argon2.hash(plain, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 1 << 16, // 65536
    parallelism: 1,
  });
}

export async function verifyDeleteKey(hash: string, plain: string): Promise<boolean> {
  if (!hash || !plain) return false;
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}