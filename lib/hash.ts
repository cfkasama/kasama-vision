// サーバ専用ユーティリティ（Edge不可）
export const runtime = "nodejs"; // 念のため

// Argon2id の推奨パラメータ（@node-rs/argon2）
const ARGON_OPTS = {
  memoryCost: 19456, // 19MB程度
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
  type: 2 as const, // Argon2id
};

export async function hashDeleteKey(plain: string): Promise<string> {
  const { hash } = await import("@node-rs/argon2");
  return hash(plain, ARGON_OPTS);
}

/**
 * 既存データに平文deleteKeyが混在していても動作させるため、
 * 先頭が `$argon2` で始まらない場合は「平文比較」を一度だけ許容。
 * （ヒットしたら、その場で再ハッシュして保存し直す運用にしている想定）
 */
export async function verifyDeleteKey(
  plain: string,
  hashedOrPlain: string | null
): Promise<boolean> {
  if (!hashedOrPlain) return false;

  if (!hashedOrPlain.startsWith("$argon2")) {
    // レガシー平文
    return plain === hashedOrPlain;
  }
  const { verify } = await import("@node-rs/argon2");
  return verify(hashedOrPlain, plain);
}