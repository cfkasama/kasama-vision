// app/m/[slug]/tagss/page.tsx
import { prisma } from "@/lib/db";
import PostsList from "@/components/Tags";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MunicipalityTagsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const slug = params.slug;

  // 存在チェック（名前出したい場合など）
  const muni = await prisma.municipality.findUnique({
    where: { slug },
    select: { slug: true, name: true },
  });
  if (!muni) return notFound();

  return (
    <>
      <PostsList
        municipalitySlug={slug}
        basePath={`/m/${slug}/tags`}
        searchParams={searchParams}
        mname={muni.name}
      />
    </>
  );
}
