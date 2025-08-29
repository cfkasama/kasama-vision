// lib/audit.ts
import { prisma } from "@/lib/db";

type WriteAdminLogArgs = {
  actor: string;                 // 管理者の識別子（メール等）
  action: string;                // 例: "REMOVE_POST" | "DISMISS" ...
  targetId?: string | string[];  // 任意：対象ID（複数なら配列OK）
  note?: string;                 // 任意メモ
  meta?: unknown;                // 任意：追加情報（JSON化される）
  postId?: string;               // 任意：関連Postに紐付けたいとき
};

export async function writeAdminLog({
  actor, action, targetId, note, meta, postId,
}: WriteAdminLogArgs) {
  const target =
    targetId == null
      ? undefined
      : Array.isArray(targetId)
      ? targetId.join(",")
      : targetId;

  await prisma.adminLog.create({
    data: {
      actor,
      action,
      target,          // ← 文字列1本にまとめて保存
      note,
      meta: meta as any,
      postId,          // ← AdminLog に postId がある場合のみ
    },
  });
}