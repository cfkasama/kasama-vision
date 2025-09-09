// components/Header.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname() || "/";
  const match = pathname.match(/^\/m\/([^/]+)/);
  const slug = match?.[1] ?? null;
  const isScoped = !!slug;

  // ページ種別に合わせてリンクを切り替え
  const homeHref  = isScoped ? `/m/${slug}` : `/`;
  const postsHref = isScoped ? `/posts?municipality=${encodeURIComponent(slug!)}` : `/posts`;
  const newHref   = isScoped ? `/new?municipality=${encodeURIComponent(slug!)}`   : `/new`;
  const tagsHref  = isScoped ? `/m/${slug}/tags` : `/tags`;

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-3">
        <Link href={homeHref} className="font-semibold hover:underline">
          みんなで考える未来
        </Link>
        <nav className="flex gap-3 text-sm">
          <Link href={postsHref} className="hover:underline">投稿一覧</Link>
          <Link href={newHref}   className="hover:underline">投稿する</Link>
          <Link href={tagsHref}  className="hover:underline">タグ</Link>
          <Link href="/m"        className="hover:underline">自治体一覧</Link>
        </nav>
      </div>
    </header>
  );
}