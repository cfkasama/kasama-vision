-- =========================
-- ENUM TYPES
-- =========================
CREATE TYPE "PostType"     AS ENUM ('CATCHPHRASE','VISION','CONSULTATION','PROPOSAL','REPORT_LIVE','REPORT_WORK','REPORT_TOURISM');
CREATE TYPE "PostStatus"   AS ENUM ('PUBLISHED','REMOVED','REALIZED');
CREATE TYPE "ReactionType" AS ENUM ('LIKE','RECOMMEND');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN','RESOLVED','DISMISSED');

-- =========================
-- TABLES
-- =========================

-- ユーザーを識別する匿名ID（Cookie等で保持想定）
CREATE TABLE "Identity" (
  "id"         TEXT PRIMARY KEY,                 -- cuid/uuid など文字列 ID
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 投稿
CREATE TABLE "Post" (
  "id"               TEXT PRIMARY KEY,            -- cuid/uuid など文字列 ID
  "type"             "PostType"   NOT NULL,
  "status"           "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "title"            TEXT         NOT NULL,
  "content"          TEXT,
  "likeCount"        INTEGER      NOT NULL DEFAULT 0,
  "recCount"         INTEGER      NOT NULL DEFAULT 0,
  "cmtCount"         INTEGER      NOT NULL DEFAULT 0,
  "hotScore"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "realizedAt"       TIMESTAMPTZ,
  "lowExposureActive" BOOLEAN     NOT NULL DEFAULT FALSE,
  "tempHiddenActive"  BOOLEAN     NOT NULL DEFAULT FALSE
);

-- タグ
CREATE TABLE "Tag" (
  "id"    TEXT PRIMARY KEY,        -- cuid/uuid
  "name"  TEXT NOT NULL UNIQUE
);

-- 中間テーブル（Post-Tag 多対多）
CREATE TABLE "PostTag" (
  "postId" TEXT NOT NULL,
  "tagId"  TEXT NOT NULL,
  PRIMARY KEY ("postId","tagId"),
  CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PostTag_tagId_fkey"  FOREIGN KEY ("tagId")  REFERENCES "Tag"("id")  ON DELETE CASCADE ON UPDATE CASCADE
);

-- リアクション（いいね/おすすめ）
CREATE TABLE "Reaction" (
  "id"         TEXT PRIMARY KEY,        -- cuid/uuid
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "type"       "ReactionType" NOT NULL,
  "identityId" TEXT         NOT NULL,
  "postId"     TEXT         NOT NULL,
  CONSTRAINT "Reaction_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reaction_postId_fkey"     FOREIGN KEY ("postId")     REFERENCES "Post"("id")     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reaction_unique_identity_post_type" UNIQUE ("identityId","postId","type")
);

-- コメント
CREATE TABLE "Comment" (
  "id"         TEXT PRIMARY KEY,        -- cuid/uuid
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "content"    TEXT         NOT NULL,
  "identityId" TEXT         NOT NULL,
  "postId"     TEXT         NOT NULL,
  CONSTRAINT "Comment_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Comment_postId_fkey"     FOREIGN KEY ("postId")     REFERENCES "Post"("id")     ON DELETE CASCADE ON UPDATE CASCADE
);

-- 通報
CREATE TABLE "AbuseReport" (
  "id"          TEXT PRIMARY KEY,        -- cuid/uuid
  "createdAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "status"      "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "identityId"  TEXT,                     -- 匿名通報を許すなら NULL 可
  "postId"      TEXT         NOT NULL,
  "reason"      TEXT,                     -- 任意: 理由メモ
  "resolvedAt"  TIMESTAMPTZ,
  "resolver"    TEXT,                     -- 任意: 処理者（メール等）
  "note"        TEXT,                     -- 任意: 備考
  CONSTRAINT "AbuseReport_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AbuseReport_postId_fkey"     FOREIGN KEY ("postId")     REFERENCES "Post"("id")     ON DELETE CASCADE ON UPDATE CASCADE
);

-- 管理ログ（モデレーション操作の記録）
CREATE TABLE "AdminLog" (
  "id"         TEXT PRIMARY KEY,         -- cuid/uuid
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "actor"      TEXT        NOT NULL,     -- 実施者（メール/ログイン名など）
  "action"     TEXT        NOT NULL,     -- 'REMOVE'|'RESTORE'|'REALIZE' など文字列
  "targetType" TEXT        NOT NULL,     -- 'POST' など
  "targetId"   TEXT        NOT NULL,     -- 単一 or カンマ区切りで複数も可
  "meta"       JSONB,                    -- 任意メタ（{count: n} 等）
  "ip"         TEXT,
  "ua"         TEXT,
  "postId"     TEXT,                     -- 任意: 1件対象ならポスト紐付け
  CONSTRAINT "AdminLog_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 集計保存用（トップ5タグ等）
CREATE TABLE "TagTop5" (
  "tagId"   TEXT PRIMARY KEY,            -- Tag.id と対応
  "tagName" TEXT NOT NULL,
  "count"   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TagTop5_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =========================
-- INDEX（よく使いそうなもの）
-- =========================
CREATE INDEX "Post_status_idx"          ON "Post"("status");
CREATE INDEX "Post_createdAt_idx"       ON "Post"("createdAt");
CREATE INDEX "Post_hotScore_idx"        ON "Post"("hotScore");
CREATE INDEX "Reaction_postId_idx"      ON "Reaction"("postId");
CREATE INDEX "Reaction_identityId_idx"  ON "Reaction"("identityId");
CREATE INDEX "Comment_postId_idx"       ON "Comment"("postId");
CREATE INDEX "AbuseReport_postId_idx"   ON "AbuseReport"("postId");
CREATE INDEX "AdminLog_createdAt_idx"   ON "AdminLog"("createdAt");
