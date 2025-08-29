import { prisma } from "@/lib/db";
import Link from "next/link";
import type { PostLite } from "@/types/db";

export default async function RealizedPage(){
  const posts = await prisma.post.findMany({ where:{ status:"REALIZED" }, orderBy:{ realizedAt:"desc" }, take: 50 });
  return <div><h1 className="text-xl font-bold mb-3">実現一覧</h1>
    <ul className="list-disc pl-5">
      {posts.map((p:PostLite)=> <li key={p.id}><Link className="text-blue-600 hover:underline" href={`/posts/${p.id}`}>{p.title}</Link> <span className="text-xs text-gray-500">({p.realizedAt?.toLocaleString?.() || ""})</span></li>)}
    </ul>
  </div>;
}
