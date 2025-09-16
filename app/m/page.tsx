// app/m/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MuniListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const order = (searchParams.order as Order) ?? "code";

  const rows = await prisma.municipality.findMany({
    select: { id: true, slug: true, name: true, code: true,
      liveCount: true, workCount: true, tourismCount: true,
    },
    orderBy: [{ [order]: "desc" as const }, { code: "asc" as const }],
    take: 200,
  });

  const score = (r: any) =>
    order === "liveCount" ? r.liveCount : order === "workCount" ? r.workCount : r.tourismCount;

  const tab = (o: Order, label: string) => {
    const active = order === o;
    const qs = new URLSearchParams({ order: o }).toString();
    return (
      <Link
        href={`/m?${qs}`}
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
        <p className="text-sm text-gray-600">並び替え：{order}</p>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {tab("liveCount", "住みたいランキング")}
        {tab("workCount", "働きたいランキング")}
        {tab("tourismCount", "行きたいランキング")}
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
                <span className="ml-1 text-gray-600">— {score(r)} 件</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
