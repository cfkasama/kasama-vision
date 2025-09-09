import type { ReactNode } from "react";

export const dynamic = "force-static";
export const runtime = "nodejs";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {/* ← Headerはここで描画しない */}
        {children}
      </body>
    </html>
  );
}