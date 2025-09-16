// app/m/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 並び替え許可キー（ホワイトリスト）
const ORDER_KEYS = ["liveCount", "workCount", "tourismCount", "code", "post"] as const;
type Order = typeof ORDER_KEYS[number];

// metric/range → order マッピング（例：monthly は *_Monthly を使うならここで切替）
function resolveOrder(searchParams: Record<string, any>): Order {
  const metric = String(searchParams.metric ?? "");
  const range  = String(searchParams.range ?? "total"); // "total" | "monthly"

  if (metric === "live")     return range === "monthly" ? "liveCount"     : "liveCount";
  if (metric === "work")     return range === "monthly" ? "workCount"     : "workCount";
  if (metric === "tourism")  return range === "monthly" ? "tourismCount"  : "tourismCount";

  // 後方互換：order= が来たらホワイトリストで許可
  const raw = String(searchParams.order ?? "");
  return (ORDER_KEYS as readonly string[]).includes(raw) ? (raw as Order) : "code";
}

export default async function MuniListPage({ searchParams }: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const order = resolveOrder(searchParams);

  // 投稿数順のときは _count を使って取得
  const rows = await prisma.municipality.findMany({
    select: {
      id: true, slug: true, name: true, code: true,
      liveCount: true, workCount: true, tourismCount: true,
      _count: { select: { posts: true } }, // ← Post との relation 名に合わせて
    },
    orderBy:
      order === "code"
        ? [{ code: "asc" as const }]
        : order === "post"
        ? [{ posts: { _count: "desc" as const } }, { code: "asc" as const }]
        : [{ [order]: "desc" as const }, { code: "asc" as const }],
    take: 200,
  });

  // 表示用のスコア
  const score = (r: typeof rows[number]) =>
    order === "liveCount" ? r.liveCount
    : order === "workCount" ? r.workCount
    : order === "tourismCount" ? r.tourismCount
    : order === "post" ? r._count.posts
    : r.code ?? ""; // code のときはコード文字列を表示（好きに整形してOK）

  const tab = (o: Order, label: string, href?: string) => {
    const active = order === o;
    const qs = href ?? `?order=${encodeURIComponent(o)}`;
    return (
      <Link
        href={`/m${qs.startsWith("?") ? qs : `?${qs}`}`}
        className={`rounded border px-3 py-1.5 text-sm ${active ? "bg-white" : "hover:bg-gray-50"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <section className="mb-4">
        <h1 className="text-2xl font-bold">自治体一覧</h1>
        <p className="text-sm text-gray-600">
          並び替え：{order === "post" ? "投稿数" : order === "code" ? "自治体コード" : order}
        </p>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {/* metric/range に合わせたリンクも併設（先のトップと整合） */}
        {tab("liveCount", "住みたいランキング", "?metric=live&range=total")}
        {tab("workCount", "働きたいランキング", "?metric=work&range=total")}
        {tab("tourismCount", "行きたいランキング", "?metric=tourism&range=total")}
        {tab("code", "自治体コード順")}
        {tab("post", "投稿数順")}
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="p-3 text-sm text-gray-600">データがありません。</p>
        ) : (
          <ol className="list-decimal pl-5 text-sm">
            {rows.map((r) => (
              <li key={r.id} className="mb-1">
                <Link href={`/m/${r.slug}`} className="hover:underline">{r.name}</Link>
                <span className="ml-1 text-gray-600">
                  — {score(r)}{order === "code" ? "" : " 件"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
