// components/Header.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderSearch from "@/components/HeaderSearch";

export default function Header() {
  const pathname = usePathname() || "/";
  const match = pathname.match(/^\/m\/([^/]+)/);
  const slug = match?.[1] ?? null;
  const isScoped = !!slug;

  // ページ種別に合わせてリンクを切り替え
  const title  = isScoped ? `みんなで創る未来 in ${slug}` : `みんなで創る未来`;
  const homeHref  = isScoped ? `/m/${slug}` : `/`;
  const postsHref = isScoped ? `/m/${slug}/posts` : `/posts`;
  const newHref   = isScoped ? `/m/${slug}/new`   : `/new`;
  const tagsHref  = isScoped ? `/m/${slug}/tags` : `/tags`;

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-3">
        <Link href={homeHref} className="font-semibold hover:underline">
          {title}
        </Link>
        <nav className="flex gap-3 text-sm">
          <Link href={postsHref} className="hover:underline">投稿一覧</Link>
          <Link href={newHref}   className="hover:underline">投稿する</Link>
          <Link href={tagsHref}  className="hover:underline">タグ</Link>
          <Link href="/m"        className="hover:underline">自治体一覧</Link>
          <HeaderSearch />
        </nav>
      </div>
    </header>
  );
}
