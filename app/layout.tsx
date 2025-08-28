import "./../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "みんなで考える笠間の未来",
  description: "投稿・評価で市民の声を可視化し、実現へつなげる。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <header className="border-b bg-white">
          <div className="container flex items-center justify-between py-3">
            <a href="/" className="font-bold">みんなで考える笠間の未来</a>
            <nav className="flex items-center gap-2 text-sm">
              <a href="/proposals" className="text-gray-600 hover:text-gray-900">提案</a>
              <a href="/realized" className="text-gray-600 hover:text-gray-900">実現</a>
              <a href="/about" className="text-gray-600 hover:text-gray-900">本サイトについて</a>
              <a href="/modlog" className="text-gray-600 hover:text-gray-900">公開ログ</a>
              <a href="/new" className="ml-2 inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">＋ 投稿</a>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
        <footer className="mt-10 border-t">
          <div className="container py-6 text-xs text-gray-500">© Kasama Future / Digital Democracy 2030</div>
        </footer>
      </body>
    </html>
  );
}
