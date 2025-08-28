// 先頭に追加
import type { VisionLite, CatchphraseLite, ProposalLite } from "@/types/db";
import Link from "next/link";

// 取得後の変数にキャスト（データ取得の実装に合わせて）
const visions = (data.visions ?? []) as VisionLite[];
const catchphrases = (data.catchphrases ?? []) as CatchphraseLite[];
const proposals = (data.proposals ?? []) as ProposalLite[];

// map 側はそのまま or 型注釈付きで
{visions.map((v: VisionLite) => (
  <li key={v.id} className="mb-1">
    <Link href={`/posts/${v.id}`} className="hover:underline">{v.title}</Link>{" "}
    <span className="text-gray-500">👍{v.likeCount}</span>
  </li>
))}