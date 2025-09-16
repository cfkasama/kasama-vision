
// lib/intentCounter.ts
import { prisma } from "@/lib/db";
import { isInThisMonth } from "@/lib/date";

// kind: "LIVE" | "WORK" | "TOURISM"
const totalField = (k: string) =>
  k === "LIVE" ? "liveCount" : k === "WORK" ? "workCount" : "tourismCount";
const monthlyField = (k: string) =>
  k === "LIVE" ? "liveCountMonthly" : k === "WORK" ? "workCountMonthly" : "tourismCountMonthly";

export async function applyIntentCreated(intentId: string) {
  await prisma.$transaction(async (tx) => {
    const intent = await tx.intent.findUnique({ where: { id: intentId } });
    if (!intent?.municipalityId) return;

    const data: any = { [totalField(intent.kind)]: { increment: 1 } };
    if (isInThisMonth(intent.createdAt)) {
      data[monthlyField(intent.kind)] = { increment: 1 };
    }
    await tx.municipality.update({ where: { id: intent.municipalityId }, data });
  });
}

export async function applyIntentDeleted(intentId: string) {
  await prisma.$transaction(async (tx) => {
    const intent = await tx.intent.findUnique({ where: { id: intentId } });
    if (!intent?.municipalityId) return;

    const data: any = { [totalField(intent.kind)]: { decrement: 1 } };
    if (isInThisMonth(intent.createdAt)) {
      data[monthlyField(intent.kind)] = { decrement: 1 };
    }
    await tx.intent.delete({ where: { id: intentId } });
    await tx.municipality.update({ where: { id: intent.municipalityId }, data });
  });
}

export async function applyIntentKindChanged(intentId: string, newKind: "LIVE"|"WORK"|"TOURISM") {
  await prisma.$transaction(async (tx) => {
    const before = await tx.intent.findUnique({ where: { id: intentId } });
    if (!before?.municipalityId || before.kind === newKind) return;

    const after = await tx.intent.update({ where: { id: intentId }, data: { kind: newKind } });

    const data: any = {
      [totalField(before.kind)]: { decrement: 1 },
      [totalField(after.kind)]:  { increment: 1 },
    };
    if (isInThisMonth(before.createdAt)) {
      data[monthlyField(before.kind)] = { decrement: 1 };
      data[monthlyField(after.kind)]  = { increment: 1 };
    }
    await tx.municipality.update({ where: { id: before.municipalityId }, data });
  });
}