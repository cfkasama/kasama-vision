// app/m/[slug]/tags/[name]/page.tsx
import { prisma } from "@/lib/db";
import TagPosts from "@/components/TagPosts";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const dynamicParams = true;

export default async function MuniTagPage({
  params,
}: {
  params: { slug: string; name: string };
}) {
  const tagName = decodeURIComponent(params.name);
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      municipality: { slug: params.slug },
      tags: { some: { tag: { name: tagName } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { tags: { include: { tag: true } } },
  });

  return <TagPosts tagName={tagName} posts={posts} municipalitySlug={params.slug} />;
}