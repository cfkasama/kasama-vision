// app/m/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Metric = "live" | "work" | "tourism";
type Range  = "total" | "monthly";

function pickField(metric: Metric, range: Range) {
  if (range === "total") {
    return metric === "live" ? "liveCount" : metric === "work" ? "workCount" : "tourismCount";
  }
  return metric === "live" ? "liveCountMonthly" : metric === "work" ? "workCountMonthly" : "tourismCountMonthly";
}

export default async function MuniListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const metric = (searchParams.metric as Metric) ?? "live";
  const range  = (searchParams.range  as Range)  ?? "total";

  const field = pickField(metric, range);

  const rows = await prisma.municipality.findMany({
    select: { id: true, slug: true, name: true, code: true,
      liveCount: true, workCount: true, tourismCount: true,
      liveCountMonthly: true, workCountMonthly: true, tourismCountMonthly: true,
    },
    orderBy: [{ [field]: "desc" as const }, { code: "asc" as const }],
    take: 500,
  });

  const score = (r: any) =>
    range === "monthly"
      ? metric === "live" ? r.liveCountMonthly : metric === "work" ? r.workCountMonthly : r.tourismCountMonthly
      : metric === "live" ? r.liveCount : metric === "work" ? r.workCount : r.tourismCount;

  const tab = (m: Metric, r: Range, label: string) => {
    const active = metric === m && range === r;
    const qs = new URLSearchParams({ metric: m, range: r }).toString();
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
        <p className="text-sm text-gray-600">並び替え：{range === "monthly" ? "月間" : "累計"} / {metric}</p>
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {tab("live", "total", "住みたい（累計）")}
        {tab("work", "total", "働きたい（累計）")}
        {tab("tourism", "total", "行きたい（累計）")}
        {tab("live", "monthly", "住みたい（月間）")}
        {tab("work", "monthly", "働きたい（月間）")}
        {tab("tourism", "monthly", "行きたい（月間）")}
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