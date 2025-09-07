// app/api/posts/route.ts（POSTだけ差し替え）
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePostBody & { municipalitySlug?: string };

    const { type, title, deleteKey, recaptchaToken, municipalitySlug } = body;
    const content = body.content ?? "";
    const tags = (body.tags ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 5);

    // バリデーション
    if (!type || !title || !deleteKey || !recaptchaToken) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ ok: false, error: "title_too_long" }, { status: 400 });
    }

    // reCAPTCHA
    const recaptchaOk = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaOk) {
      return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });
    }

    // 削除キーをハッシュ化
    const hashed = await hashDeleteKey(deleteKey);

    // 投稿者の identity
    const identityId = await getOrCreateIdentityId();

    // 自治体IDを確定（slug 指定があればそれを、無ければ "all" を使う。無ければ作る）
    let municipalityId: string;
    if (municipalitySlug) {
      const m = await prisma.municipality.findUnique({ where: { slug: municipalitySlug } });
      if (!m) {
        return NextResponse.json({ ok: false, error: "municipality_not_found" }, { status: 404 });
      }
      municipalityId = m.id;
    } else {
      const globalSlug = "all";
      let m = await prisma.municipality.findUnique({ where: { slug: globalSlug } });
      if (!m) {
        m = await prisma.municipality.create({
          data: { slug: globalSlug, name: "全国" },
        });
      }
      municipalityId = m.id;
    }

    // Post 作成（municipalityId を必ず渡す）
    const post = await prisma.post.create({
      data: {
        type,
        title,
        content,
        deleteKey: hashed,
        identityId,
        municipalityId, // ← これが必須！
        // status は Prisma 側の default(PUBLISHED) に任せるなら省略OK
      },
    });

    // タグ upsert → PostTag 連結
    for (const name of tags) {
      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      await prisma.postTag.create({
        data: { postId: post.id, tagId: tag.id },
      });
    }

    return NextResponse.json({ ok: true, id: post.id });
  } catch (err) {
    console.error("[POST /api/posts] error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}