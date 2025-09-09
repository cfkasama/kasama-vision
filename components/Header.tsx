import Link from "next/link";

type Props = {
  municipality?: { slug: string; name: string; prefecture?: string | null } | null;
};

export default function Header({ municipality }: Props) {
  if (!municipality) {
    // 全国版ヘッダー
    return (
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl flex items-center justify-between p-4">
          <Link href="/" className="text-lg font-bold text-blue-600">
            みんなで考える未来（全国版）
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/posts" className="hover:underline">投稿一覧</Link>
            <Link href="/m" className="hover:underline">自治体一覧</Link>
            <Link href="/tags" className="hover:underline">タグ一覧</Link>
          </nav>
        </div>
      </header>
    );
  }

  // 自治体版ヘッダー
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-5xl flex items-center justify-between p-4">
        <Link href={`/m/${municipality.slug}`} className="text-lg font-bold text-green-700">
          {(municipality.prefecture ? `${municipality.prefecture} ` : "") + municipality.name} の未来
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href={`/m/${municipality.slug}/posts`} className="hover:underline">投稿一覧</Link>
          <Link href="/m" className="hover:underline">← 自治体一覧</Link>
        </nav>
      </div>
    </header>
  );
}