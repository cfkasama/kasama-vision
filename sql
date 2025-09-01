-- AdminLog に target を追加
ALTER TABLE "AdminLog" ADD COLUMN IF NOT EXISTS "target" TEXT;

-- Post に deleteKey を追加
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "deleteKey" TEXT;
