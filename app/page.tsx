import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, Pill, Chip } from "@/components/ui";
import IntentButtons from "@/components/IntentButtons";
import type { VisionLite, CatchphraseLite, ProposalLite } from "@/types/db";

async function getHero() {
  const [catchphrase] = await prisma.post.findMany({
    where: { type: "CATCHPHRASE", status: "PUBLISHED" }, orderBy: { likeCount: "desc" }, take: 1,
  });
  const visions = await prisma.post.findMany({
    where: { type: "VISION", status: "PUBLISHED" }, orderBy: { likeCount: "desc" }, take: 3,
  });
  return { catchphrase, visions };
}
async function getList(sort: "new"|"likes"|"comments"|"hot" = "new") {
  const orderBy = sort==="likes" ? { likeCount:"desc" } : sort==="comments" ? { cmtCount:"desc" } : sort==="hot" ? { hotScore:"desc" } : { createdAt:"desc" };
  return prisma.post.findMany({ where: { status:"PUBLISHED" }, orderBy, take: 20, include: { tags: { include: { tag:true } } } });
}
async function getTopTags() {
  return prisma.tagTop5.findMany({ orderBy: { count: "desc" }, take: 5 });
}

export default async function Home({ searchParams }:{ searchParams:{ sort?:string } }) {
  const sort = (searchParams.sort as any) ?? "new";
  const [{ catchphrase, visions }, posts, topTags] = await Promise.all([ getHero(), getList(sort), getTopTags() ]);

  return (
    <>
      <section className="mb-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">みんなで考える笠間の未来</h1>
            <p className="text-sm text-gray-600">3行からOK。匿名で投稿、いいね/推薦で可視化、実現へ。</p>
          </div>
          <div className="flex gap-2">
            <Link href="/new" className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">＋ 投稿する</Link>
            <Link href="/proposals" className="inline-flex items-center rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50">提案</Link>
            <Link href="/realized" className="inline-flex items-center rounded-lg border bg白 px-3 py-1.5 hover:bg-gray-50">実現</Link>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Card>
            <div className="mb-2"><Pill>キャッチフレーズ</Pill></div>
            {catchphrase ? (
              <>
                <h3 className="font-semibold">{catchphrase.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{catchphrase.content?.slice(0,120)}{catchphrase.content?.length>120?"…":""}</p>
                <Link href={`/posts/${catchphrase.id}`} className="mt-3 inline-block text-sm text-blue-600 hover:underline">見る</Link>
              </>
            ) : <p className="text-sm">まだありません。<Link href="/new?type=CATCHPHRASE" className="text-blue-600 hover:underline">最初の1件を投稿</Link></p>}
          </Card>

          <Card>
            <div className="mb-2"><Pill color="gray">ビジョン TOP3</Pill></div>
            {visions?.length ? (
              <ol className="list-decimal pl-5 text-sm">
                {visions.map(v => (
                  <li key={v.id} className="mb-1">
                    <Link href={`/posts/${v.id}`} className="hover:underline">{v.title}</Link>{" "}
                    <span className="text-gray-500">👍{v.likeCount}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm">最初のビジョンを投稿しよう。</p>}
          </Card>

          <Card>
            <div className="mb-2"><Pill color="green">タグ TOP5</Pill></div>
            <ul className="flex flex-wrap gap-2">
              {topTags.map(t => (
                <li key={t.id}>
                  <Link href={`/tags/${encodeURIComponent(t.tagName)}`} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {t.tagName}（{t.count}）
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="mt-4">
          {/* @ts-expect-error */}
          <IntentButtons />
        </div>
      </section>

      <section className="mb-4 flex items-center justify-between">
        <div className="flex gap-2 text-sm">
          {[["new","新着"],["hot","トレンド"],["likes","いいね順"],["comments","コメント多い順"]].map(([key,label]) => (
            <Link key={key} href={`/?sort=${key}`} className={`rounded-lg border px-3 py-1.5 hover:bg-gray-50 ${sort===key?"bg-white":""}`}>{label}</Link>
          ))}
        </div>
        <div className="text-sm text-gray-500">全{posts.length}件</div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {posts.map(p => (
          <Card key={p.id} className="flex flex-col">
            <header className="mb-1 flex items-center gap-2">
              <Pill>{p.type}</Pill>
              {p.likeCount>=100 && <Pill color="gold">100いいね</Pill>}
              {p.status==="REALIZED" && <Pill color="green">実現</Pill>}
            </header>
            <h3 className="mb-1 line-clamp-2 font-semibold"><Link href={`/posts/${p.id}`} className="hover:underline">{p.title}</Link></h3>
            <p className="flex-1 text-sm text-gray-600">{p.content?.slice(0,140)}{p.content?.length>140?"…":""}</p>
            <footer className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex flex-wrap gap-1">{p.tags.map((t:any) => <Chip key={t.tagId}>{t.tag.name}</Chip>)}</div>
              <div>👍 {p.likeCount}　⭐ {p.recCount}　💬 {p.cmtCount}</div>
            </footer>
          </Card>
        ))}
      </section>
    </>
  );
}
