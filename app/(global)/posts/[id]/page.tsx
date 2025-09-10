import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PostDetail from "@/components/PostDetail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PostDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { tags: { include: { tag: true } } },
  });

  if (!post || post.status !== "PUBLISHED") {
    notFound();
  }

  return <PostDetail post={post} />;
}