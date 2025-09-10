// app/(global)/posts/[id]/page.tsx
import PostDetail from "@/components/PostDetail";

export default function Page({ params }: { params: { id: string,slug:string } }) {
  return <PostDetail id={params.id} slug={params.slug} />;
}
