// lib/identity.ts
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE_KEY = "kid"; // Kasama Identity
const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

function setIdentityCookie(id: string) {
  cookies().set(COOKIE_KEY, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TWO_YEARS,
  });
}

export async function assertNotLocked(identityId: string) {
  const me = await prisma.identity.findUnique({
    where: { id: identityId },
    select: { lockedUntil: true },
  });
  // 行が無い（DBリセット後の古いクッキーなど）の場合は「未ロック扱い」で素通し
  if (!me) return;

  if (me.lockedUntil && me.lockedUntil > new Date()) {
    const err = new Error("locked");
    (err as any).status = 403;
    throw err;
  }
}

export async function getOrCreateIdentityId(): Promise<string> {
  const jar = cookies();
  const existing = jar.get(COOKIE_KEY)?.value;

  if (existing) {
    // ★ 既存クッキーが DB に実在するか検証
    const has = await prisma.identity.findUnique({
      where: { id: existing },
      select: { id: true },
    });
    if (has) return existing;

    // 実在しなければ再発行（DB がリセットされた等）
    const created = await prisma.identity.create({ data: {} });
    setIdentityCookie(created.id);
    return created.id;
  }

  // クッキーが無ければ新規発行
  const created = await prisma.identity.create({ data: {} });
  setIdentityCookie(created.id);
  return created.id;
}

/** 既存クッキーがあれば返す。無ければ null（DB 検証はしない軽量版） */
export function getIdentityIdIfAny(): string | null {
  try {
    return cookies().get(COOKIE_KEY)?.value ?? null;
  } catch {
    return null;
  }
}