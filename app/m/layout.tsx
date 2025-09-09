import type { ReactNode } from "react";
import Header from "@/components/Header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function MLayout(
  { children, params }: { children: ReactNode; params: { slug: string } }
) {

  return (
    <>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  );
}
