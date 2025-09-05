import { prisma } from "@/lib/db";
import ReactionBar from "@/components/ReactionBar";
import CommentList from "@/components/CommentList";
import { Pill, Chip } from "@/components/ui";
import ReportButton from "@/components/ReportButton";
import {PostStatus}from "@prisma/client";
import Link from "next/link";

type PostType =
  | "CATCHPHRASE"
  | "VISION"
  | "CONSULTATION"
  | "PROPOSAL"
  | "REPORT_LIVE"
  | "REPORT_WORK"
  | "REPORT_TOURISM";

  const labelByType: Partial<Record<PostType, string>> = {
    CATCHPHRASE: "キャッチフレーズ",
    VISION: "ビジョン",
    CONSULTATION: "相談",
    PROPOSAL: "提案",
    REPORT_LIVE: "住めなかった報告",
    REPORT_WORK: "働けなかった報告",
    REPORT_TOURISM: "不満がある報告",
  };

export default async function PostDetail({ params }:{ params:{ id:string }}) {
  const post = await prisma.post.findUnique({ where: { id: params.id }, include: { tags: { include: { tag:true } } } });
  if (!post || post.status!=="PUBLISHED") return <div>見つかりませんでした。</div>;

  return (
    <div className="mx-auto max-w-2xl">
              <Link href={`/posts?type=${p.id}`} className="text-sm text-gray-600 hover:underline">
                ← 一覧へ
              </Link>

      <div className="mt-2 flex items-center gap-2">
        <Pill>{labelByType[post.type as PostType] ?? post.type}</Pill>
        {post.likeCount>=100 && <Pill color="gold">100いいね</Pill>}
        {(()=>{
        const status = post.status as PostStatus;
        return(
          <>
        {status=== PostStatus.REALIZED && <Pill color="green">実現</Pill>}
            </>
          );
    })()}
      </div>

      <h2 className="mt-2 text-xl font-bold">{post.title}</h2>

      <div className="mt-1 flex flex-wrap gap-1">
        {post.tags.map((t:any) => <Chip key={t.tagId}><Link href={`/tags/${encodeURIComponent(t.tag.name)}`} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {t.tag.name}
                </Link></Chip>)}
      </div>

      <article className="prose-basic mt-3 text-[15px] text-gray-800">
        <p>{post.content}</p>
      </article>

      <ReactionBar postId={post.id} likeCount={post.likeCount}  />
      <CommentList postId={post.id}  />
      <ReportButton postId={post.id} />
    </div>
  );
}
