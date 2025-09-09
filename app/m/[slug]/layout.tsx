import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";

export const dynamic = "force-dynamic"; // DB参照するので動的
export const runtime = "nodejs";

export default async function MunicipalityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const muni = await prisma.municipality.findUnique({
    where: { slug: params.slug },
    select: { slug: true, name: true, prefecture: true },
  });
  if (!muni) notFound();

  return (
    <>
      <Header municipality={muni} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  );
}