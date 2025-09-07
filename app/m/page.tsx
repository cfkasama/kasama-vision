// app/municipalities/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Pill } from "@/components/ui";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MRow = {
  id: string;
  name: string;
  slug: string;
  prefecture: string | null;
};

async function getMunicipalities() {
  const list = await prisma.municipality.findMany({
    select: { id: true, name: true, slug: true, prefecture: true },
    orderBy: [{ prefecture: "asc" }, { name: "asc" }],
  });
  return list as MRow[];
}

async function getPostCounts() {
  const rows = await prisma.post.groupBy({
    by: ["municipalityId"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  // { municipalityId -> count } のマップを作る
  return Object.fromEntries(rows.map((r) => [r.municipalityId, r._count._all as number]));
}

export default async function MunicipalitiesPage() {
  const [munis, countsMap] = await Promise.all([getMunicipalities(), getPostCounts()]);

  return (
    <>
      <section className="mb-6">
        <h1 className="text-2xl font-bold">自治体一覧</h1>
        <p className="text-sm text-gray-600">
          全国の自治体ごとの相談・意見・提案を集めています。自治体カードをクリックして詳細へ。
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {munis.map((m) => {
          const total = countsMap[m.id] ?? 0;
          return (
            <Card key={m.id} className="flex flex-col">
              <div className="mb-1 flex items-center justify-between">
                <Pill>{m.prefecture ?? "—"}</Pill>
                <span className="text-xs text-gray-500">投稿数 {total}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                <Link href={`/m/${m.slug}`} className="hover:underline">
                  {m.name}
                </Link>
              </h3>

              <div className="mt-auto flex gap-2">
                <Link
                  href={`/m/${m.slug}`}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                  自治体ページへ
                </Link>
                <Link
                  href={`/posts?m=${encodeURIComponent(m.slug)}`}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  投稿一覧
                </Link>
              </div>
            </Card>
          );
        })}
      </section>

      {munis.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">まだ自治体が登録されていません。</p>
      )}
    </>
  );
}