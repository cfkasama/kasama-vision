export async function verifyRecaptcha(token: string) {
  const secret = process.env.RECAPTCHA_SECRET!;
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type":"application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`
  });
  const json = await res.json();
  return json.success && (json.score ?? 0) >= 0.5;
}
