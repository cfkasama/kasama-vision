// lib/recaptcha.ts
const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export type RecaptchaResult = {
  ok: boolean;
  score?: number;
  action?: string;
  errorCodes?: string[];
  reason?: string; // 追加: 失敗理由のテキスト
};

export async function verifyRecaptcha(token: string, minScore = 0.5): Promise<RecaptchaResult> {
  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      return { ok: false, reason: "secret_missing" };
    }
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
    });

    const json = (await res.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };

    if (!json.success) {
      return { ok: false, action: json.action, score: json.score, errorCodes: json["error-codes"], reason: "verify_failed" };
    }
    if (typeof json.score === "number" && json.score < minScore) {
      return { ok: false, action: json.action, score: json.score, reason: "low_score" };
    }
    return { ok: true, action: json.action, score: json.score };
  } catch (e) {
    return { ok: false, reason: "exception" };
  }
}