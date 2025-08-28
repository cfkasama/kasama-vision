// 共通で使う最小限の型定義（Prismaのselect結果に合わせた軽量タイプ）

// ==== AbuseReport 系 ====

// select: { postId: true }
export type AbusePostIdRow = { postId: string };

// select: { identityId: true }
export type AbuseIdentityRow = { identityId: string | null };

// ==== Post（Hot再計算で使う軽量版） ====
// select: { id, createdAt, likeCount, recCount, cmtCount }
export type PostLite = {
  id: string;
  createdAt: Date;
  likeCount: number;
  recCount: number;
  cmtCount: number;
};

// ==== タグTop5のRAW結果 ====
// $queryRaw で返す { tag_id, tag_name, cnt }
export type TopTagRow = {
  tag_id: string;
  tag_name: string;
  cnt: number;
};

// ==== コメント軽量（必要なら） ====
// select: { id, content, likeCount }
export type CommentLite = {
  id: string;
  content: string;
  likeCount: number;
};
