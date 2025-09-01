-- =========================
-- 1) Enum（存在しなければ作成 & 値の補正）
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostType') THEN
    CREATE TYPE "PostType" AS ENUM ('CATCHPHRASE','VISION','CONSULTATION','PROPOSAL','REPORT_LIVE','REPORT_WORK','REPORT_TOURISM');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostStatus') THEN
    CREATE TYPE "PostStatus" AS ENUM ('PUBLISHED','REMOVED','REALIZED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReactionType') THEN
    CREATE TYPE "ReactionType" AS ENUM ('LIKE','RECOMMEND');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportStatus') THEN
    CREATE TYPE "ReportStatus" AS ENUM ('OPEN','RESOLVED','DISMISSED');
  END IF;
END$$;

-- 既存の enum に足りない値があれば追加（将来用の保険。今は全て揃っている想定）
ALTER TYPE "PostType"     ADD VALUE IF NOT EXISTS 'CATCHPHRASE';
ALTER TYPE "PostType"     ADD VALUE IF NOT EXISTS 'VISION';
ALTER TYPE "PostType"     ADD VALUE IF NOT EXISTS 'CONSULTATION';
ALTER TYPE "PostType"     ADD VALUE IF NOT EXISTS 'PROPOSAL';
ALTER TYPE "PostType"     ADD VALUE IF NOT EXISTS 'REPORT_LIVE';
ALTER TYPE "PostType"     ADD VALUE IF NOT EXISTS 'REPORT_WORK';
ALTER TYPE "PostType"     ADD VALUE IF NOT EXISTS 'REPORT_TOURISM';

ALTER TYPE "PostStatus"   ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "PostStatus"   ADD VALUE IF NOT EXISTS 'REMOVED';
ALTER TYPE "PostStatus"   ADD VALUE IF NOT EXISTS 'REALIZED';

ALTER TYPE "ReactionType" ADD VALUE IF NOT EXISTS 'LIKE';
ALTER TYPE "ReactionType" ADD VALUE IF NOT EXISTS 'RECOMMEND';

ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'DISMISSED';

-- =========================
-- 2) テーブル作成（無ければ）
-- =========================

CREATE TABLE IF NOT EXISTS "Identity" (
  "id"           TEXT PRIMARY KEY,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Post" (
  "id"                 TEXT PRIMARY KEY,
  "type"               "PostType"   NOT NULL,
  "status"             "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
  "title"              TEXT         NOT NULL,
  "content"            TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT now(),
  "likeCount"          INTEGER      NOT NULL DEFAULT 0,
  "recCount"           INTEGER      NOT NULL DEFAULT 0,
  "cmtCount"           INTEGER      NOT NULL DEFAULT 0,
  "hotScore"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deleteKey"          TEXT,
  "lowExposureActive"  BOOLEAN      NOT NULL DEFAULT false,
  "lowExposureAt"      TIMESTAMP(3),
  "tempHiddenActive"   BOOLEAN      NOT NULL DEFAULT false,
  "tempHiddenAt"       TIMESTAMP(3),
  "realizedAt"         TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "Reaction" (
  "id"          TEXT PRIMARY KEY,
  "type"        "ReactionType" NOT NULL,
  "createdAt"   TIMESTAMP(3)   NOT NULL DEFAULT now(),
  "postId"      TEXT           NOT NULL,
  "identityId"  TEXT,
  CONSTRAINT "Reaction_post_fkey"    FOREIGN KEY ("postId")     REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "Reaction_identity_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Comment" (
  "id"          TEXT PRIMARY KEY,
  "content"     TEXT         NOT NULL,
  "likeCount"   INTEGER      NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  "postId"      TEXT         NOT NULL,
  "identityId"  TEXT,
  CONSTRAINT "Comment_post_fkey"     FOREIGN KEY ("postId")     REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "Comment_identity_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AbuseReport" (
  "id"          TEXT PRIMARY KEY,
  "reason"      TEXT,
  "status"      "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt"   TIMESTAMP(3)   NOT NULL DEFAULT now(),
  "resolvedAt"  TIMESTAMP(3),
  "resolver"    TEXT,
  "note"        TEXT,
  "postId"      TEXT           NOT NULL,
  "identityId"  TEXT,
  CONSTRAINT "AbuseReport_post_fkey"     FOREIGN KEY ("postId")     REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "AbuseReport_identity_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Tag" (
  "id"    TEXT PRIMARY KEY,
  "name"  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "PostTag" (
  "postId" TEXT NOT NULL,
  "tagId"  TEXT NOT NULL,
  PRIMARY KEY ("postId","tagId"),
  CONSTRAINT "PostTag_post_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PostTag_tag_fkey"  FOREIGN KEY ("tagId")  REFERENCES "Tag"("id")  ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TagTop5" (
  "id"        TEXT PRIMARY KEY,
  "tagId"     TEXT NOT NULL,
  "tagName"   TEXT NOT NULL,
  "count"     INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AdminLog" (
  "id"        TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "actor"     TEXT NOT NULL,
  "action"    TEXT NOT NULL,
  "target"    TEXT,
  "note"      TEXT,
  "meta"      JSONB,
  "postId"    TEXT,
  CONSTRAINT "AdminLog_post_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- =========================
-- 3) 既存テーブルに不足カラムがあれば追加
-- =========================
ALTER TABLE "Identity"  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now();

ALTER TABLE "Post"
  ADD COLUMN IF NOT EXISTS "type"              "PostType",
  ADD COLUMN IF NOT EXISTS "status"            "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "title"             TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "content"           TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "likeCount"         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "recCount"          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cmtCount"          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "hotScore"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deleteKey"         TEXT,
  ADD COLUMN IF NOT EXISTS "lowExposureActive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lowExposureAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "tempHiddenActive"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tempHiddenAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "realizedAt"        TIMESTAMP(3);

ALTER TABLE "Reaction"
  ADD COLUMN IF NOT EXISTS "type"        "ReactionType",
  ADD COLUMN IF NOT EXISTS "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "postId"      TEXT,
  ADD COLUMN IF NOT EXISTS "identityId"  TEXT;

ALTER TABLE "Comment"
  ADD COLUMN IF NOT EXISTS "content"     TEXT,
  ADD COLUMN IF NOT EXISTS "likeCount"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "postId"      TEXT,
  ADD COLUMN IF NOT EXISTS "identityId"  TEXT;

ALTER TABLE "AbuseReport"
  ADD COLUMN IF NOT EXISTS "reason"      TEXT,
  ADD COLUMN IF NOT EXISTS "status"      "ReportStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "resolvedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolver"    TEXT,
  ADD COLUMN IF NOT EXISTS "note"        TEXT,
  ADD COLUMN IF NOT EXISTS "postId"      TEXT,
  ADD COLUMN IF NOT EXISTS "identityId"  TEXT;

ALTER TABLE "Tag"
  ADD COLUMN IF NOT EXISTS "name" TEXT;

ALTER TABLE "AdminLog"
  ADD COLUMN IF NOT EXISTS "actor"     TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS "action"    TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS "target"    TEXT,
  ADD COLUMN IF NOT EXISTS "note"      TEXT,
  ADD COLUMN IF NOT EXISTS "meta"      JSONB,
  ADD COLUMN IF NOT EXISTS "postId"    TEXT;

-- =========================
-- 4) 外部キー（不足時のみ付与）
--    ※ CREATE TABLE で既に付与済みならスキップされます
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Reaction_post_fkey') THEN
    ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_post_fkey"
      FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Reaction_identity_fkey') THEN
    ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_identity_fkey"
      FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comment_post_fkey') THEN
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_post_fkey"
      FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comment_identity_fkey') THEN
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_identity_fkey"
      FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AbuseReport_post_fkey') THEN
    ALTER TABLE "AbuseReport" ADD CONSTRAINT "AbuseReport_post_fkey"
      FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AbuseReport_identity_fkey') THEN
    ALTER TABLE "AbuseReport" ADD CONSTRAINT "AbuseReport_identity_fkey"
      FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostTag_post_fkey') THEN
    ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_post_fkey"
      FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PostTag_tag_fkey') THEN
    ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_tag_fkey"
      FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminLog_post_fkey') THEN
    ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_post_fkey"
      FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- =========================
-- 5) インデックス / 一意制約
-- =========================
-- Prisma の @@index 相当
CREATE INDEX IF NOT EXISTS "AdminLog_createdAt_idx" ON "AdminLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "AdminLog_actor_idx"     ON "AdminLog" ("actor");
CREATE INDEX IF NOT EXISTS "AdminLog_action_idx"    ON "AdminLog" ("action");

-- Tag.name はユニーク
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag" ("name");

-- Reaction の複合ユニーク @@unique([postId, identityId, type])
CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_post_identity_type_key"
  ON "Reaction" ("postId","identityId","type");