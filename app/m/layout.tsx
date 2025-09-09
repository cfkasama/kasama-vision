import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Header from "@/components/Header";

export const dynamic = "force-dynamic"; // ← 動的
export const runtime = "nodejs";
export const revalidate = 0;

export default async function MLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const muni = await prisma.municipality.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, name: true, prefecture: true },
  });

  if (!muni) notFound();

  return (
    <>
      <Header municipality={muni} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  );
}