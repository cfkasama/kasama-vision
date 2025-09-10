// app/new/page.tsx
import { prisma } from "@/lib/db";
import NewPostClient from "@/components/NewPostClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const typeFromQuery = typeof searchParams.type === "string" ? searchParams.type : undefined;
  // 存在チェック（名前出したい場合など）
    const slug = params.slug;
  
  const municipalities = await prisma.municipality.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  // 日本/本サイトを先頭へ（存在すれば）
  const bySlug = Object.fromEntries(municipalities.map(m => [m.slug, m]));
  const prioritized = [
    ...(bySlug["japan"] ? [bySlug["japan"]] : []),
    ...(bySlug["site"] ? [bySlug["site"]] : []),
    ...municipalities.filter(m => m.slug !== "japan" && m.slug !== "site"),
  ];

  return (
    <NewPostClient
      initialType={typeFromQuery}
      municipalities={prioritized}
      initialMunicipalitySlug={slug} 
    />
  );
}
