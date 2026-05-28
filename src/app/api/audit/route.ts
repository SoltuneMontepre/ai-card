import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getUserFromSession() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

/** Derives the public origin from Next.js / proxy headers — no env var needed. */
function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  const user = await getUserFromSession();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { inputText, trustScore, stepResults } = await request.json();
    const origin = getOrigin(request);

    const audit = await prisma.auditSession.create({
      data: {
        userId: user.id,
        inputText,
        trustScore,
        completedAt: new Date(),
        stepResults: {
          create: (
            stepResults as Array<{ stepNumber: number; data: object }>
          ).map((s) => ({
            stepNumber: s.stepNumber,
            data: s.data,
          })),
        },
      },
    });

    // Build and persist the canonical verify URL
    const verifyUrl = `${origin}/verify/${audit.auditCode}`;
    await prisma.auditSession.update({
      where: { id: audit.id },
      data: { verifyUrl },
    });

    return Response.json({
      auditCode: audit.auditCode,
      id: audit.id,
      verifyUrl,
    });
  } catch {
    return Response.json({ error: "Failed to save audit" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getUserFromSession();
  if (!user) return Response.json([]);

  const audits = await prisma.auditSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
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

  return Response.json(audits);
}
