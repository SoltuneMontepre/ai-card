import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getPublicAudit = cache(async (auditCode: string) => {
  return prisma.auditSession.findUnique({
    where: { auditCode },
    select: {
      auditCode: true,
      verifyUrl: true,
      trustScore: true,
      completedAt: true,
      createdAt: true,
      stepResults: {
        orderBy: { stepNumber: "asc" },
        select: { stepNumber: true, data: true },
      },
    },
  });
});
