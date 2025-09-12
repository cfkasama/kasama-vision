// app/m/page.tsx  （自治体一覧ページ）
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { getIntentRankingMonthly } from "@/lib/ranking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseSort(q: string | string[] | undefined) {
  const s = Array.isArray(q) ? q[0] : q;
  return s === "work" ? "work" : s === "tourism" ? "tourism" : "live" as
    | "live"
    | "work"
    | "tourism";
}

export default async function MunicipalityIndex({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sort = parseSort(searchParams.sort);
  const kind = sort === "live" ? "LIVE" : sort === "work" ? "WORK" : "TOURISM";

  // 月間ランキング（intent基準）をベースに一覧を作る
  const ranked = await getIntentRankingMonthly(kind, 200);

  // ランキングに含まれない自治体（今月0件）は末尾へ名称順で追加
  const rankedIds = new Set(ranked.map((r) => r.id));
  const rest = await prisma.municipality.findMany({
    where: { id: { notIn: Array.from(rankedIds) } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  const all = [
    ...ranked,
    ...rest.map((m) => ({ id: m.id, name: m.name, slug: m.slug, count: 0 })),
  ];

  const Tab = ({ v, label }: { v: string; label: string }) => {
    const href = `/m?sort=${v}`;
    const active = (v === "live" && sort === "live") || (v === "work" && sort === "work") || (v === "tourism" && sort === "tourism");
    return (
      <Link
        href={href}
        className={`rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 ${
          active ? "bg-white" : ""
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <section className="mb-4">
        <h1 className="text-2xl font-bold">自治体一覧（今月の意向ランキング順）</h1>
        <p className="text-sm text-gray-600">ソート: {sort === "live" ? "住みたい" : sort === "work" ? "働きたい" : "行きたい"}</p>
      </section>

      <div className="mb-4 flex gap-2">
        <Tab v="live" label="住みたい" />
        <Tab v="work" label="働きたい" />
        <Tab v="tourism" label="行きたい" />
      </div>

      <Card>
        {all.length ? (
          <ol className="list-decimal pl-5 text-sm">
            {all.map((m) => (
              <li key={m.id} className="mb-1">
                <Link href={`/m/${m.slug}`} className="hover:underline">
                  {m.name}
                </Link>{" "}
                — {m.count} 件
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm">自治体データがありません。</p>
        )}
      </Card>
    </>
  );
}