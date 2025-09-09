// app/tags/page.tsx
import TagsList from "@/components/TagsList";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function TagsIndexPage() {
  // グローバル（全体）タグ一覧
  return <TagsList title="タグ一覧" />;
}