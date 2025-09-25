// app/m/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 並び替え許可キー（ホワイトリスト）
const ORDER_KEYS = ["liveCount", "workCount", "tourismCount", "code", "post"] as const;
type Order = typeof ORDER_KEYS[number];

const PAGE_SIZE = 200;

// metric/range → order マッピング
function resolveOrder(searchParams: Record<string, any>): Order {
  const metric = String(searchParams.metric ?? "");
  const range = String(searchParams.range ?? "total"); // "total" | "monthly" （今は同じ列を使用）

  if (metric === "live") return "liveCount";
  if (metric === "work") return "workCount";
  if (metric === "tourism") return "tourismCount";

  const raw = String(searchParams.order ?? "");
  return (ORDER_KEYS as readonly string[]).includes(raw as any) ? (raw as Order) : "code";
}

function getPage(sp: Record<string, any>) {
  const n = Number(sp.page ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function buildQS(sp: Record<string, any>, patch: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    const str = Array.isArray(v) ? v[0] : String(v);
    if (str) qs.set(k, str);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null || v === "") qs.delete(k);
    else qs.set(k, String(v));
  }
  return `?${qs.toString()}`;
}

export default async function MuniListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const order = resolveOrder(searchParams as any);
  const page = getPage(searchParams as any);
  const skip = (page - 1) * PAGE_SIZE;

  // 総件数（ページャ用）
  const total = await prisma.municipality.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 表示データ
  let rows:
    | {
        id: string;
        slug: string;
        name: string;
        code: string | null;
        liveCount: number;
        workCount: number;
        tourismCount: number;
        _count?: { posts: number };
      }[]
    = [];

  if (order === "post") {
    // 1) Post を municipalityId で集計して降順IDリストを作る
    const g = await prisma.post.groupBy({
      by: ["municipalityId"],
      where: { status: "PUBLISHED" }, // 必要に応じて条件調整
      _count: { _all: true },
    });

    // 降順（投稿多い順）
    const sortedWithCount = g
      .filter((r) => r.municipalityId)
      .sort((a, b) => b._count._all - a._count._all);

    const rankedIds = sortedWithCount.map((r) => r.municipalityId!);

    // 投稿0の自治体も末尾に追加したい → 全自治体から未出現IDを付け足す
    if (rankedIds.length < total) {
      const allIds = await prisma.municipality.findMany({ select: { id: true } });
      const set = new Set(rankedIds);
      const zeroIds = allIds.map((x) => x.id).filter((id) => !set.has(id));
      rankedIds.push(...zeroIds);
    }

    // ページ対象のIDを切り出し
    const sliceIds = rankedIds.slice(skip, skip + PAGE_SIZE);

    // 詳細取得（表示列＋_count.posts も付ける）
    const details = await prisma.municipality.findMany({
      where: { id: { in: sliceIds } },
      select: {
        id: true,
        slug: true,
        name: true,
        code: true,
        liveCount: true,
        workCount: true,
        tourismCount: true,
        _count: { select: { posts: true } },
      },
    });

    // ページ内で並び順をID順（sliceIds）に揃える
    const orderMap = new Map(sliceIds.map((id, i) => [id, i]));
    rows = details.sort((a, b) => (orderMap.get(a.id)! - orderMap.get(b.id)!));
  } else {
    // 通常カラムでのorderBy + skip/take
    rows = await prisma.municipality.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        code: true,
        liveCount: true,
        workCount: true,
        tourismCount: true,
        _count: { select: { posts: true } }, // 表示用
      },
      orderBy:
        order === "code"
          ? [{ code: "asc" as const }]
          : [{ [order]: "desc" as const }, { code: "asc" as const }],
      skip,
      take: PAGE_SIZE,
    });
  }

  // 表示用のスコア
  const score = (r: (typeof rows)[number]) =>
    order === "liveCount"
      ? r.liveCount
      : order === "workCount"
      ? r.workCount
      : order === "tourismCount"
      ? r.tourismCount
      : order === "post"
      ? r._count?.posts ?? 0
      : r.code ?? r.code;

  const tab = (o: Order, label: string, href?: string) => {
    const active = order === o;
    const qs = href ?? buildQS(searchParams, { order: o, page: 1 });
    return (
      <Link
        href={`/m${qs.startsWith("?") ? qs : `?${qs}`}`}
        className={`rounded border px-3 py-1.5 text-sm ${active ? "bg-white" : "hover:bg-gray-50"}`}
      >
        {label}
      </Link>
    );
  };

  const pager = (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-gray-600">
        {total} 件中 {(skip + 1).toLocaleString()}–{Math.min(skip + PAGE_SIZE, total).toLocaleString()} を表示
      </span>
      <div className="flex items-center gap-2">
        <Link
          aria-disabled={page <= 1}
          href={`/m${buildQS(searchParams, { page: Math.max(1, page - 1) })}`}
          className={`rounded border px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-gray-50"}`}
        >
          ← 前へ
        </Link>
        <span>
          {page} / {totalPages}
        </span>
        <Link
          aria-disabled={page >= totalPages}
          href={`/m${buildQS(searchParams, { page: Math.min(totalPages, page + 1) })}`}
          className={`rounded border px-3 py-1.5 ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-gray-50"}`}
        >
          次へ →
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <section className="mb-4">
        <h1 className="text-2xl font-bold">自治体一覧</h1>
        <p className="text-sm text-gray-600">
          並び替え：{order === "post" ? "投稿数" : order === "code" ? "自治体コード" : order}
        </p>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {tab("liveCount", "住みたいランキング", buildQS(searchParams, { metric: "live", range: "total", order: undefined, page: 1 }))}
        {tab("workCount", "働きたいランキング", buildQS(searchParams, { metric: "work", range: "total", order: undefined, page: 1 }))}
        {tab("tourismCount", "行きたいランキング", buildQS(searchParams, { metric: "tourism", range: "total", order: undefined, page: 1 }))}
        {tab("code", "自治体コード順")}
        {tab("post", "投稿数順")}
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="p-3 text-sm text-gray-600">データがありません。</p>
        ) : (
          <>
                        {pager}
            <ol className="list pl-5 text-sm">
              {rows.map((r) => (
                <li key={r.id} className="mb-1">
                  <Link href={`/m/${r.slug}`} className="hover:underline">
                    {r.name}
                  </Link>
                  <span className="ml-1 text-gray-600">
                    — {score(r)}
                    {order === "code" ? "" : " 件"}
                  </span>
                </li>
              ))}
            </ol>
            {pager}
          </>
        )}
      </Card>
    </>
  );
}
