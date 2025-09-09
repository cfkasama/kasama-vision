import type { ReactNode } from "react";
import Header from "@/components/Header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic"; // ← slug/DBに依存するので動的
export const revalidate = 0;
export const runtime = "nodejs";        // Prisma を使うので nodejs

export default async function MLayout(
  { children, params }: { children: ReactNode; params: { slug: string } }
) {
  // slug から自治体を取得（無ければ null を渡す）
  const municipality = await prisma.municipality.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, name: true, prefecture: true },
  });

  return (
    <>
      <Header municipality={municipality ?? null} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  );
}