// lib/password.ts
import "server-only";
import argon2 from "argon2";

export async function hashDeleteKey(plain: string) {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 1 << 16,
    parallelism: 1,
  });
}

export async function verifyDeleteKey(hash: string, plain: string) {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}