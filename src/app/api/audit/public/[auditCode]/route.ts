import { getPublicAudit } from "@/lib/audit-public";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ auditCode: string }> },
) {
  const { auditCode } = await params;

  const audit = await getPublicAudit(auditCode);

  if (!audit) {
    return Response.json({ error: "Audit not found" }, { status: 404 });
  }

  return Response.json(audit);
}
