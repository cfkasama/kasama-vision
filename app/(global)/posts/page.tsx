// app/posts/page.tsx
import Posts from "@/components/Posts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  return (
    <Posts
      municipalitySlug={undefined}
      searchParams={searchParams}
    />
  );
}
