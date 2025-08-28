import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";

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
  content: string;
  tags?: string[];
  deleteKey: string;
  recaptchaToken: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const sort = (searchParams.get("sort") as SortKey) ?? "new";
  const page = Number(searchParams.get("page") ?? "1");
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
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreatePostBody;
  const { type, title, content, deleteKey, recaptchaToken } = body;
  const tags = (body.tags ?? []).map((s) => s.trim()).filter(Boolean);

  if (!type || !title || !deleteKey || !recaptchaToken) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const ok = await verifyRecaptcha(recaptchaToken);
  if (!ok) return NextResponse.json({ ok: false, error: "recaptcha" }, { status: 400 });

  const post = await prisma.post.create({
    data: { type, title, content, deleteKey }, // deleteKey はすでにhash化済み想定の実装なら差し替え
  });

  for (const name of tags.slice(0, 5)) {
    const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
    await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
  }

  return NextResponse.json({ ok: true, id: post.id });
}