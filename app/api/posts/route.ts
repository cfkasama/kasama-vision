import { verifyRecaptcha } from "@/lib/recaptcha";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, title, deleteKey, recaptchaToken } = body ?? {};
    const content = body?.content ?? "";
    const tags = (body?.tags ?? []).map((s: string) => s.trim()).filter(Boolean).slice(0, 5);

    // 必須チェック
    const missing: string[] = [];
    if (!type) missing.push("type");
    if (!title) missing.push("title");
    if (!deleteKey) missing.push("deleteKey");
    if (!recaptchaToken) missing.push("recaptchaToken");
    if (missing.length) {
      return NextResponse.json({ ok: false, error: "bad_request", missing }, { status: 400 });
    }

    // reCAPTCHA
    const result = await verifyRecaptcha(recaptchaToken);
    if (!result.ok) {
      // デバッグのため詳細をそのまま返す（落ち着いたらマスクしてOK）
      return NextResponse.json(
        { ok: false, error: "recaptcha", detail: result },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: { type, title, content, deleteKey },
    });

    for (const name of tags) {
      const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
      await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
    }
    return NextResponse.json({ ok: true, id: post.id });
  } catch (err) {
    console.error("[POST /api/posts] error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}