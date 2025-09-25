import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return <div className="p-6 text-sm">権限が必要です。</div>;
  }

  return (
    <div className="py-6">
      <AdminDashboard
        me={{ login: (session as any).login ?? session.user?.email ?? "admin" }}
      />
    </div>
  );
}