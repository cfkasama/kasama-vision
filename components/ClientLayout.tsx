// components/ClientLayout.tsx
"use client";

import { usePathname } from "next/navigation";
import RecaptchaLoader from "@/components/RecaptchaLoader";

const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const needRecaptcha =
    pathname.startsWith("/new") ||
    pathname.startsWith("/posts/"); // コメント投稿ページ

  return (
    <>
      {needRecaptcha && <RecaptchaLoader siteKey={siteKey} />}
      {children}
    </>
  );
}
