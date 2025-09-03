// lib/identity.ts
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE_KEY = "kid"; // Kasama Identity

export async function getOrCreateIdentityId(): Promise<string> {
  const jar = cookies();
  const existing = jar.get(COOKIE_KEY)?.value;
  if (existing) return existing;

  const created = await prisma.identity.create({ data: {} });
  jar.set(COOKIE_KEY, created.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2, // 2年
  });
  return created.id;
}

/** 既存クッキーがあれば返す。無ければ null */
export function getIdentityIdIfAny(): string | null {
  try {
    return cookies().get(COOKIE_KEY)?.value ?? null;
  } catch {
    return null;
  }
}