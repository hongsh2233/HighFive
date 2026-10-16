import { prisma } from '@/lib/db';
import type { McpPrincipal } from './auth';
// Do not store bearer tokens, arbitrary input, task titles or comment contents.
export async function auditMcp(action: string, outcome: string, principal?: McpPrincipal) {
  await prisma.auditLog.create({ data: { organizationId: principal?.organizationId, userId: principal?.userId,
    action: `MCP_${action}`, targetType: 'MCP', detail: { outcome, ...(principal ? { credentialId: principal.credentialId } : {}) } } });
}
