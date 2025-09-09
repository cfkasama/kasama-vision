import type { ReactNode } from "react";

export const dynamic = "force-static";
export const runtime = "nodejs";
import "./../styles/globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* ← Headerはここで描画しない */}
        {children}
      </body>
      <footer className="mt-10 border-t">
          <div className="container py-6 text-xs text-gray-500">©cfkasama</div>
        </footer>
    </html>
  );
}
