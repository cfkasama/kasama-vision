// components/ClientLayout.tsx
"use client";

import { usePathname } from "next/navigation";
import RecapchaLoader from "@/components/RecapchaLoader";

const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const needRecaptcha =
    pathname.startsWith("/new") ||
    pathname.startsWith("/posts/"); // コメント投稿ページ

  return (
    <>
      {needRecaptcha && <RecapchaLoader siteKey={siteKey} />}
      {children}
    </>
  );
}
