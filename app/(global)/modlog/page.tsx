import { prisma } from "@/lib/db";

export default async function ModLogPage() {
  const logs = await prisma.adminLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { post: { select: { id:true, title:true } } }
  });

  return (
    <div className="mx-auto max-w-3xl py-6">
      <h1 className="mb-4 text-xl font-bold">公開モデレーションログ</h1>
      <p className="mb-6 text-sm text-gray-600">投稿に対する通報や管理判断の履歴を公開しています。</p>
      <table className="w-full table-fixed border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs text-gray-500">
            <th className="w-40 px-2">日時</th>
            <th className="w-24 px-2">操作</th>
            <th className="px-2">対象投稿</th>
            <th className="px-2">理由</th>
            <th className="w-24 px-2">担当</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l:any)=>(
            <tr key={l.id} className="bg-gray-50">
              <td className="px-2 text-xs text-gray-500">{new Date(l.createdAt).toLocaleString()}</td>
              <td className="px-2 text-xs">{l.action}</td>
              <td className="px-2 text-sm">
                <a href={`/posts/${l.postId}`} className="text-blue-600 hover:underline">{l.post.title || "(無題)"}</a>
              </td>
              <td className="px-2 text-xs text-gray-700">{l.reason || "-"}</td>
              <td className="px-2 text-xs">{l.actor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
