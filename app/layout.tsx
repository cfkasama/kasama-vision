// app/layout.tsx
import "./../styles/globals.css";
import type { ReactNode } from "react";
import Header from "@/components/Header";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Header /> {/* ← ここだけ！ */}
        <main className="mx-auto max-w-5xl p-4">{children}</main>
                <footer className="mt-10 border-t">
          <div className="container py-6 text-xs text-gray-500">©cfkasama</div>
        </footer>
      </body>
    </html>
  );
}
