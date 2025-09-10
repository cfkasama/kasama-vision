// components/PostDetail.tsx
import Link from "next/link";
import { Pill, Chip } from "@/components/ui";
import ReactionBar from "@/components/ReactionBar";
import CommentList from "@/components/CommentList";
import ReportButton from "@/components/ReportButton";
import type { Post, PostStatus } from "@prisma/client";

type PostWithTags = Post & {
  tags: { tagId: string; tag: { name: string } }[];
};

type Props = {
  post: PostWithTags;
  municipalitySlug?: string; // 自治体スコープ時は付与
};

const labelByType: Record<Post["type"], string> = {
  CATCHPHRASE: "キャッチフレーズ",
  VISION: "ビジョン",
  CONSULTATION: "相談",
  PROPOSAL: "提案",
  REPORT_LIVE: "住めなかった報告",
  REPORT_WORK: "働けなかった報告",
  REPORT_TOURISM: "不満がある報告",
};

function buildPostsQuery(q: Record<string, string | number | undefined>) {
  return (
    "/posts?" +
    Object.entries(q)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&")
  );
}

export default function PostDetail({ post, municipalitySlug }: Props) {
  const backHref = buildPostsQuery({
    type: post.type,
    municipality: municipalitySlug, // 自治体ページから来た時はこのパラメータ付き一覧へ戻す
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={backHref} className="text-sm text-gray-600 hover:underline">
        ← 一覧へ
      </Link>

      <div className="mt-2 flex items-center gap-2">
        <Pill>{labelByType[post.type] ?? post.type}</Pill>
        {post.likeCount >= 100 && <Pill color="gold">100いいね</Pill>}
        {post.status === "REALIZED" && <Pill color="green">実現</Pill>}
      </div>

      <h2 className="mt-2 text-xl font-bold">{post.title}</h2>

      <div className="mt-1 flex flex-wrap gap-1">
        {post.tags.map((t) => (
          <Chip key={t.tagId}>
            <Link
              href={buildPostsQuery({
                tag: t.tag.name,
                municipality: municipalitySlug,
              })}
              className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs"
            >
              {t.tag.name}
            </Link>
          </Chip>
        ))}
      </div>

      <article className="prose-basic mt-3 text-[15px] text-gray-800">
        <p>{post.content}</p>
      </article>

      <div className="mt-3">
        <ReactionBar postId={post.id} likeCount={post.likeCount} />
      </div>

      <div className="mt-6">
        <CommentList postId={post.id} />
      </div>

      <div className="mt-4">
        <ReportButton postId={post.id} />
      </div>
    </div>
  );
}
