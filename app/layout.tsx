import type { ReactNode } from "react";
import Header from "@/components/Header";
import "./../styles/globals.css";

export const dynamic = "force-static"; // ここは静的でOK
export const runtime = "nodejs";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Header municipality={null} />
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}