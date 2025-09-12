// app/page.tsx
import HomeSections from "@/components/HomeSections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  return <HomeSections scope="GLOBAL" />;
}