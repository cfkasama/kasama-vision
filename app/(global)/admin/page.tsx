import { prisma } from "@/lib/db";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) return <div className="py-10"><AdminLogin/></div>;

  const posts = await prisma.post.findMany({
    orderBy: { createdAt:"desc" }, take: 30,
    include: { tags: { include: { tag:true }}, comments: true }
  });
  return <div className="py-6">
    <AdminDashboard me={{ login: (session as any).login }} initialPosts={JSON.parse(JSON.stringify(posts))}/>
  </div>;
}
