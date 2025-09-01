// lib/recaptcha.ts
const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/**
 * reCAPTCHA v3 を検証する
 * - 成功かつ score がしきい値以上で true
 * - 失敗/低スコアは false
 */
export async function verifyRecaptcha(token: string, minScore = 0.5): Promise<boolean> {
  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      console.error("RECAPTCHA_SECRET_KEY is not set");
      return false;
    }

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
      // 失敗時リトライ要らないのでOK
      cache: "no-store",
    });

    const json = (await res.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };

    if (!json.success) {
      console.warn("reCAPTCHA verify failed:", json["error-codes"]);
      return false;
    }
    if (typeof json.score === "number" && json.score < minScore) {
      console.warn("reCAPTCHA low score:", json.score);
      return false;
    }
    return true;
  } catch (e) {
    console.error("reCAPTCHA verify exception:", e);
    return false;
  }
}