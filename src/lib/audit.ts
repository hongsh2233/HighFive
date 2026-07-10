import { prisma } from './db';

interface AuditParams {
  organizationId?: number | null;
  userId?: number | null;
  userEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: number;
  detail?: Record<string, unknown> | null;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({ data: params as any });
  } catch {
    // audit log failure must not break main flow
  }
}
