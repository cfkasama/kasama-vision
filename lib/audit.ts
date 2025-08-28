import { prisma } from "@/lib/db";
import { headers } from "next/headers";

type AuditInput = {
  actor: string;
  action: string;
  targetType: string;
  targetId?: string | string[];
  meta?: Record<string, any>;
};

export async function writeAuditLog({ actor, action, targetType, targetId, meta }: AuditInput) {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || undefined;
  const ua = h.get("user-agent") || undefined;
  await prisma.adminLog.create({
    data: {
      actor,
      action,
      targetType,
      targetId: Array.isArray(targetId) ? targetId.join(",") : targetId,
      meta, ip, ua
    }
  });
}
