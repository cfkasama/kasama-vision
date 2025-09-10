import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PostDetail from "@/components/PostDetail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MuniPostDetailPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const muni = await prisma.municipality.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true },
  });
  if (!muni) notFound();

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { tags: { include: { tag: true } } },
  });

  // 自治体不一致や非公開なら 404
  if (!post || post.status !== "PUBLISHED" || post.municipalityId !== muni.id) {
    notFound();
  }

  return <PostDetail post={post} municipalitySlug={muni.slug} />;
}