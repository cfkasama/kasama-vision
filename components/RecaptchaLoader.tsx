"use client";
import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: any;
    __recaptchaReady__?: boolean;
  }
}

export default function RecaptchaLoader({ siteKey }: { siteKey: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    // siteKey 未設定の診断
    if (!siteKey || siteKey === "undefined") {
      console.error("[reCAPTCHA] NEXT_PUBLIC_RECAPTCHA_SITE_KEY が未設定です。");
    }
    // まず google ドメイン、失敗時は recaptcha.net に切替
    setSrc(`https://www.google.com/recaptcha/api.js?render=${siteKey}`);
  }, [siteKey]);

  return (
    <>
      {/* 1発目（google） */}
      {src && (
        <Script
          src={src}
          strategy="afterInteractive"
          onLoad={() => {
            console.log("[reCAPTCHA] google script loaded");
            if (window.grecaptcha?.ready) {
              window.grecaptcha.ready(() => {
                window.__recaptchaReady__ = true;
                console.log("[reCAPTCHA] ready (google)");
              });
            }
          }}
          onError={() => {
            console.warn("[reCAPTCHA] google 失敗 -> recaptcha.net にフォールバック");
            const alt = document.createElement("script");
            alt.src = `https://www.recaptcha.net/recaptcha/api.js?render=${siteKey}&hl=ja`;
            alt.async = true;
            alt.defer = true;
            alt.onload = () => {
              console.log("[reCAPTCHA] recaptcha.net script loaded");
              if (window.grecaptcha?.ready) {
                window.grecaptcha.ready(() => {
                  window.__recaptchaReady__ = true;
                  console.log("[reCAPTCHA] ready (recaptcha.net)");
                });
              }
            };
            alt.onerror = () => {
              console.error("[reCAPTCHA] recaptcha.net も読み込み失敗");
            };
            document.head.appendChild(alt);
          }}
        />
      )}
    </>
  );
}
