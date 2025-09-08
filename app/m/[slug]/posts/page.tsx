// app/m/[slug]/posts/page.tsx
import { prisma } from "@/lib/db";
import PostsList from "@/components/posts";
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
    <>
      <h1 className="mb-3 text-2xl font-bold">{muni.name} の投稿一覧</h1>
      <PostsList
        municipalitySlug={slug}
        basePath={`/m/${slug}/posts`}
        searchParams={searchParams}
      />
    </>
  );
}
