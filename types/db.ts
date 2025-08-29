// =======================
// 共通 型定義ファイル
// =======================

// ==== AbuseReport rows ====

// select: { postId: true }
export type AbusePostIdRow = { postId: string };

// select: { identityId: true }
export type AbuseIdentityRow = { identityId: string | null };

// ==== Post (Hot再計算用の軽量版) ====
// select: { id, createdAt, likeCount, recCount, cmtCount }
export type PostLite = {
  id: string;
  createdAt: Date;
  likeCount: number;
  recCount: number;
  cmtCount: number;
};

export type PostA = {
  id: string;
  title:string;
  realizedAt: Date | null;
  createdAt: Date;
  likeCount: number;
  recCount: number;
  cmtCount: number;
};

// ==== Tag top5 raw ====
// $queryRaw: { tag_id, tag_name, cnt }
export type TopTagRow = {
  tag_id: string;
  tag_name: string;
  cnt: number;
};

// ==== Comment lite ====
// select: { id, content, likeCount }
export type CommentLite = {
  id: string;
  content: string;
  likeCount: number;
};

// =======================
// フロント表示用 (トップページなど)
// =======================

// Vision (いいね数上位3件)
export type VisionLite = {
  id: string;
  title: string;
  likeCount: number;
};

// Catchphrase (キャッチフレーズ1位)
export type CatchphraseLite = {
  id: string;
  title: string;
  likeCount: number;
};

// Proposal (いいね100件以上 or 実現済み)
export type ProposalLite = {
  id: string;
  title: string;
  likeCount: number;
};

// Consultation (相談一覧用)
export type ConsultationLite = {
  id: string;
  title: string;
  content: string;
  likeCount: number;
};
