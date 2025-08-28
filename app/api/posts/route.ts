import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { scryptSync, randomBytes } from "crypto";

function hashDeleteKey(plain:string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;
  const tag  = searchParams.get("tag") ?? undefined;
  const sort = searchParams.get("sort") ?? "new";
  const page = Number(searchParams.get("page") ?? "1");
  const take = 20, skip = (page-1)*take;

  const orderBy = sort==="likes" ? { likeCount:"desc" }
               : sort==="comments" ? { cmtCount:"desc" }
               : sort==="hot" ? { hotScore:"desc" }
               : { createdAt:"desc" };

  const where:any = { status: "PUBLISHED", ...(type ? { type } : {}) ,
    ...(tag ? { tags: { some: { tag: { name: tag }}} } : {}) };

  const posts = await prisma.post.findMany({
    where, orderBy, take, skip, include: { tags: { include: { tag:true } } }
  });
  return NextResponse.json({ ok:true, posts });
}

export async function POST(req: Request) {
  const { type, title, content, tags=[], deleteKey, recaptchaToken } = await req.json();
  if (!(await verifyRecaptcha(recaptchaToken))) return NextResponse.json({ ok:false, error:"recaptcha" }, { status: 400 });

  const post = await prisma.post.create({ data: { type, title, content, deleteKey: hashDeleteKey(deleteKey) }});
  if (tags.length) {
    for (const name of tags.slice(0,5)) {
      const tag = await prisma.tag.upsert({ where:{ name }, update:{}, create:{ name }});
      await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id }});
    }
  }
  return NextResponse.json({ ok:true, id: post.id });
}
