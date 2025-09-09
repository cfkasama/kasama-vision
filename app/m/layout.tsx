import type { ReactNode } from "react";
import Header from "@/components/Header";

export const dynamic = "force-static";
export const runtime = "nodejs";

export default function MLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header municipality={null} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  );
}