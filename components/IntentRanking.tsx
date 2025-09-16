// components/IntentRanking.tsx
import Link from "next/link";
import { Card, Pill } from "@/components/ui";
import { getIntentRankingMonthly } from "@/lib/ranking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function IntentRanking() {
  const [live, work, tourism] = await Promise.all([
    getIntentRankingMonthly("LIVE", 3),
    getIntentRankingMonthly("WORK", 3),
    getIntentRankingMonthly("TOURISM", 3),
  ]);

  const Block = ({
    title,
    items,
    pillColor,
  }: {
    title: string;
    items: { id: string; name: string; slug: string; count: number }[];
    pillColor?: "green" | "gray" | "gold";
  }) => (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <Pill color={pillColor}>{title}（今月）</Pill>
      </div>
      {items.length ? (
        <ol className="list-decimal pl-5 text-sm">
          {items.map((m) => (
            <li key={m.id} className="mb-1">
              <Link href={`/m/${m.slug}`} className="hover:underline">
                {m.name}
              </Link>{" "}
              — {m.count} 件
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm">今月のデータはまだありません。</p>
      )}
      <div className="mt-3">
        <Link
          href={`/m?sort=${encodeURIComponent(title)}`}
          className="inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          自治体一覧で見る
        </Link>
      </div>
    </Card>
  );

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-3">
      <Block title="住みたい" items={live} pillColor="green" />
      <Block title="働きたい" items={work} pillColor="gray" />
      <Block title="行きたい" items={tourism} pillColor="gold" />
    </section>
  );
}
