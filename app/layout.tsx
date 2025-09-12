// app/layout.tsx
import "./../styles/globals.css";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import type { Metadata } from "next";
import ClientLayout from "@/components/ClientLayout"; // ← 追加
const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
export const metadata: Metadata = {
  title: "みんなで創る未来",
  description: "投稿・評価で市民の声を可視化し、実現へつなげる。",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ClientLayout>
        <Header /> {/* ← ここだけ！ */}
        <main className="mx-auto max-w-5xl p-4">{children}</main>
                <footer className="mt-10 border-t">
          <div className="container py-6 text-xs text-gray-500">©cfkasama</div>
        </footer>
        </ClientLayout>
      </body>
    </html>
  );
}
