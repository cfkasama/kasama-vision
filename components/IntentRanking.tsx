// components/IntentRanking.tsx
import Link from "next/link";
import { Card, Pill } from "@/components/ui";
// ⬇️ これに変更
import { fetchMunicipalityRanking } from "@/lib/ranking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Metric = "live" | "work" | "tourism";

export default async function IntentRanking({
  metric,
  title = "月間ランキング",
  limit = 20,
}: { metric: Metric; title?: string; limit?: number }) {
  // ⬇️ 月間を直接指定
  const rows = await fetchMunicipalityRanking(metric, "monthly", limit);

  return (
    <section className="mt-4">
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Pill color="gray">{title}</Pill>
        </div>
        {rows.length ? (
          <ol className="list-decimal pl-5 text-sm">
            {rows.map((m) => {
              const score =
                metric === "live"
                  ? m.liveCountMonthly
                  : metric === "work"
                  ? m.workCountMonthly
                  : m.tourismCountMonthly;
              return (
                <li key={m.id} className="mb-1">
                  <Link href={`/m/${m.slug}`} className="hover:underline">
                    {m.name}
                  </Link>
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