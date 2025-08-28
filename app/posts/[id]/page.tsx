import { prisma } from "@/lib/db";
import ReactionBar from "@/components/ReactionBar";
import CommentList from "@/components/CommentList";
import { Pill, Chip } from "@/components/ui";
import ReportButton from "@/components/ReportButton";

export default async function PostDetail({ params }:{ params:{ id:string }}) {
  const post = await prisma.post.findUnique({ where: { id: params.id }, include: { tags: { include: { tag:true } } } });
  if (!post || post.status!=="PUBLISHED") return <div>見つかりませんでした。</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <a href="/" className="text-sm text-gray-600 hover:underline">← 一覧へ</a>

      <div className="mt-2 flex items-center gap-2">
        <Pill>{post.type}</Pill>
        {post.likeCount>=100 && <Pill color="gold">100いいね</Pill>}
        {post.status==="REALIZED" && <Pill color="green">実現</Pill>}
      </div>

      <h2 className="mt-2 text-xl font-bold">{post.title}</h2>

      <div className="mt-1 flex flex-wrap gap-1">
        {post.tags.map((t:any) => <Chip key={t.tagId}>{t.tag.name}</Chip>)}
      </div>

      <article className="prose-basic mt-3 text-[15px] text-gray-800">
        <p>{post.content}</p>
      </article>

      {/* @ts-expect-error server/client */}
      <ReactionBar postId={post.id} likeCount={post.likeCount} recCount={post.recCount} />
      {/* @ts-expect-error server/client */}
      <CommentList postId={post.id} />
      {/* @ts-expect-error server/client */}
      <ReportButton postId={post.id} />
    </div>
  );
}
