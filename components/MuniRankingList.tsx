// components/MuniRankingList.tsx
import Link from "next/link";
import { Card, Pill } from "@/components/ui";
import { fetchMunicipalityRanking, type Metric, type Range } from "@/lib/ranking";

export default async function MuniRankingList({
  metric,
  range,
  title,
  limit = 100,
}: {
  metric: Metric;      // "live" | "work" | "tourism"
  range: Range;        // "total" | "monthly"
  title?: string;
  limit?: number;
}) {
  const rows = await fetchMunicipalityRanking(metric, range, limit);

  return (
    <section className="mt-4">
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Pill color={range === "monthly" ? "gray" : "green"}>
            {title ?? `自治体ランキング（${range === "monthly" ? "月間" : "累計"} / ${metric}）`}
          </Pill>
        </div>
        {rows.length ? (
          <ol className="list-decimal pl-5 text-sm">
            {rows.map((m) => {
              const score = range === "monthly"
                ? metric === "live" ? m.liveCountMonthly : metric === "work" ? m.workCountMonthly : m.tourismCountMonthly
                : metric === "live" ? m.liveCount : metric === "work" ? m.workCount : m.tourismCount;

              return (
                <li key={m.id} className="mb-1">
                  <Link href={`/m/${m.slug}`} className="hover:underline">{m.name}</Link>
                  <span className="ml-1 text-gray-600">— {score} 件</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm">データがありません。</p>
        )}
      </Card>
    </section>
  );
}
