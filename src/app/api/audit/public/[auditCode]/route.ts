import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ auditCode: string }> },
) {
  const { auditCode } = await params;

  const audit = await prisma.auditSession.findUnique({
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

  if (!audit) {
    return Response.json({ error: "Audit not found" }, { status: 404 });
  }

  return Response.json(audit);
}
