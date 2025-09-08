// app/posts/page.tsx
import PostsList from "@/components/posts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <PostsList
      municipalitySlug={undefined}
      basePath="/posts"
      searchParams={searchParams}
    />
  );
}
