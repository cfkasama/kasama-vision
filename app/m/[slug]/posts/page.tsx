// app/m/[slug]/posts/page.tsx
import { prisma } from "@/lib/db";
import Posts from "@/components/Posts";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MunicipalityPostsPage({
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
      <Posts
        municipalitySlug={slug}
        basePath={`/m/${slug}/posts`}
        searchParams={searchParams}
        municipalityName={muni.name}
      />
  );
}
