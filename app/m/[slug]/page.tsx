// app/m/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import HomeSections from "@/components/HomeSections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MunicipalityPage({
  params,
}: {
  params: { slug: string };
}) {
  const muni = await prisma.municipality.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, name: true, prefecture: true },
  });
  if (!muni) notFound();

  return <HomeSections scope="MUNI" muni={muni} />;
}