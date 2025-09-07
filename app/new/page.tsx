// app/new/page.tsx
import { prisma } from "@/lib/db";
import NewPostClient from "./NewPostClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // 種別はクエリ ?type=CONSULTATION 等で初期化できるように
  const typeFromQuery = typeof searchParams.type === "string" ? searchParams.type : undefined;

  // 自治体一覧（名前順）
  const municipalities = await prisma.municipality.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <NewPostClient
      initialType={typeFromQuery}
      municipalities={municipalities}
    />
  );
}