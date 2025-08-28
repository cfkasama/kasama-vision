import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export async function getOrCreateIdentityId() {
  const c = cookies();
  let aid = c.get("aid")?.value;
  if (!aid) {
    aid = randomUUID();
    c.set("aid", aid, { httpOnly: true, sameSite: "lax", maxAge: 60*60*24*365 });
    await prisma.identity.create({ data: { id: aid } });
  }
  return aid;
}
