import { prisma } from "@/lib/db";
import{PostLite} from "@/types/db";

import Link from "next/link";
export default async function ProposalsPage(){
  const posts = await prisma.post.findMany({ where:{ type:"PROPOSAL", status:"PUBLISHED" }, orderBy:{ hotScore:"desc" }, take: 50 });
  return <div><h1 className="text-xl font-bold mb-3">提案一覧</h1>
    <ul className="list-disc pl-5">
      {posts.map((p:PostLite)=> <li key={p.id}><Link className="text-blue-600 hover:underline" href={`/posts/${p.id}`}>{p.title}</Link></li>)}
    </ul>
  </div>;
}
