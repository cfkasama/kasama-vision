// components/PostDetail.tsx
import { prisma } from "@/lib/db";
import ReactionBar from "@/components/ReactionBar";
import CommentList from "@/components/CommentList";
import CommentComposer from "@/components/CommentComposer";
import { Pill, Chip } from "@/components/ui";
import ReportButton from "@/components/ReportButton";
import { PostStatus } from "@prisma/client";
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

export default async function PostDetail({ id,slug }: { id: string ,slug?:string}) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      municipality: { select: { slug: true, name: true } },
    },
  });

  if (!post || post.status === PostStatus.REMOVED) {
    return <div>見つかりませんでした。</div>;
  }

  const listBase =
    slug ? `/m/${slug}/posts` : `/posts`;

  const muniSlug = post.municipality?.slug;
  const muniName = post.municipality?.name;
  
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mt-2 flex items-center gap-2">
            <Chip>
              <Link
                href={`${listBase}?type=${encodeURIComponent(post.type)}`}
                className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs"
              >
                {labelByType[post.type as PostType] ?? post.type}
              </Link>
            </Chip>
              <Chip>
              <Link
                href={`/m/${muniSlug}`}
                className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs"
              >
                {muniName}
              </Link>
            </Chip>
        {post.likeCount >= 100 && <Pill color="gold">100いいね</Pill>}
        {post.status === PostStatus.REALIZED && <Pill color="green">実現</Pill>}
         {post.status === PostStatus.CHALLENGE && <Pill color="gold">挑戦中</Pill>}
      </div>

      <h2 className="mt-2 text-xl font-bold">{post.title}</h2>

      <div className="mt-1 flex flex-wrap gap-1">
        {post.tags.map((t) => {
          const tagLink = `${listBase}?tag=${encodeURIComponent(t.tag.name)}`;
          return (
            <Chip key={t.tagId}>
              <Link
                href={tagLink}
                className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs"
              >
                {t.tag.name}
              </Link>
            </Chip>
          );
        })}
      </div>

      <article className="prose-basic mt-3 text-[15px] text-gray-800">
        <p>{post.content}</p>
      </article>

      <ReactionBar postId={post.id} likeCount={post.likeCount} />
      <CommentComposer postId={post.id} postType={post.type as any} />
      <CommentList postId={post.id} />
      <ReportButton postId={post.id} />
    </div>
  );
}
