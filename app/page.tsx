import Link from "next/link";
import type { VisionLite, CatchphraseLite, ProposalLite } from "@/types/db";


export default async function HomePage() {
  const visions: VisionLite[] = [];
  const catchphrases: CatchphraseLite[] = [];
  const proposals: ProposalLite[] = [];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-semibold mb-2">ビジョン上位</h2>
        <ol className="list-decimal pl-5 text-sm">
          {visions.map((v) => (
            <li key={v.id}>
              <Link href={`/posts/${v.id}`} className="hover:underline">{v.title}</Link>{" "}
              <span className="text-gray-500">👍{v.likeCount}</span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="font-semibold mb-2">キャッチフレーズ1位</h2>
        <ul className="list-disc pl-5 text-sm">
          {catchphrases.map((c) => (
            <li key={c.id}>
              <Link href={`/posts/${c.id}`} className="hover:underline">{c.title}</Link>{" "}
              <span className="text-gray-500">👍{c.likeCount}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold mb-2">いいね100提案</h2>
        <ul className="list-disc pl-5 text-sm">
          {proposals.map((p) => (
            <li key={p.id}>
              <Link href={`/posts/${p.id}`} className="hover:underline">{p.title}</Link>{" "}
              <span className="text-gray-500">👍{p.likeCount}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
