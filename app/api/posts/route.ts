// app/api/posts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";

export const dynamic = "force-dynamic"; // SSG/ISRに巻き込まれないように
export const revalidate = 0;

type SortKey = "new" | "likes" | "comments" | "hot";

type CreatePostBody = {
  type:
    | "CATCHPHRASE"
    | "VISION"
    | "CONSULTATION"
    | "PROPOSAL"
    | "REPORT_LIVE"
    | "REPORT_WORK"
    | "REPORT_TOURISM";
  title: string;
  content?: string;
  tags?: string[];
  deleteKey: string;
  recaptchaToken: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const sort = (searchParams.get("sort") as SortKey) ?? "new";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const take = 20;
    const skip = (page - 1) * take;

    const orderBy =
      sort === "likes"
        ? { likeCount: "desc" as const }
        : sort === "comments"
        ? { cmtCount: "desc" as const }
        : sort === "hot"
        ? { hotScore: "desc" as const }
        : { createdAt: "desc" as const };

    const where: any = {
      status: "PUBLISHED",
      ...(type ? { type } : {}),
      ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
    };

    const posts = await prisma.post.findMany({
      where,
      orderBy,
      take,
      skip,
      include: { tags: { include: { tag: true } } },
    });

    return NextResponse.json({ ok: true, posts });
  } catch (err) {
    console.error("[GET /api/posts] error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePostBody;

    const { type, title, deleteKey, recaptchaToken } = body;
    const content = body.content ?? "";
    const tags = (body.tags ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5); // 念のため最大5件

    // 基本バリデーション
    if (!type || !title || !deleteKey || !recaptchaToken) {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ ok: false, error: "title_too_long" }, { status: 400 });
    }

    // reCAPTCHA検証
    const recaptchaOk = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaOk) {
      return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });
    }

    // 必要ならここでdeleteKeyをハッシュ化に差し替え
    // const hashed = await bcrypt.hash(deleteKey, 10);

    const post = await prisma.post.create({
      data: {
        type,
        title,
        content,
        deleteKey, // 実運用はハッシュに！
        // status は Prisma の default(PUBLISHED) に任せる
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