// lib/municipality.ts
import { prisma } from "@/lib/db";

export async function getMunicipalityBySlug(slug: string) {
  return prisma.municipality.findUnique({ where: { slug } });
}

export async function ensureKasamaSeed() {
  const slug = "kasama";
  const found = await prisma.municipality.findUnique({ where: { slug } });
  if (found) return found;
  return prisma.municipality.create({
    data: { id: "kasama-0001", name: "笠間市", slug: "kasama", prefecture: "茨城県" },
  });
}