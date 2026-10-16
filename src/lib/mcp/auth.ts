import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireServiceAuth, serviceHasPermission } from '@/lib/service-auth';
import { COMMENT_SCOPE, CREATE_SCOPE, READ_SCOPE, McpError, type McpConfig } from './config';

let cachedKeys: { url: string; keys: ReturnType<typeof createRemoteJWKSet> } | undefined;
export async function verifyMcpToken(token: string, config: McpConfig) {
  if (!cachedKeys || cachedKeys.url !== config.jwks) cachedKeys = { url: config.jwks, keys: createRemoteJWKSet(new URL(config.jwks), { timeoutDuration: 5000 }) };
  const { payload } = await jwtVerify(token, cachedKeys.keys, {
    issuer: config.issuer, audience: config.resource, algorithms: ['RS256', 'ES256'], requiredClaims: ['sub', 'exp'],
  });
  if (payload.sub !== config.subject) throw new McpError(403, 'MCP_FORBIDDEN');
  const scopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : [];
  if (!scopes.includes(READ_SCOPE)) throw new McpError(403, 'MCP_INSUFFICIENT_SCOPE');
  return scopes;
}
export async function authenticateMcp(req: Request, config: McpConfig) {
  const match = req.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i);
  if (!match || match[1].length > 16384) throw new McpError(401, 'MCP_UNAUTHORIZED');
  let scopes: string[];
  try { scopes = await verifyMcpToken(match[1], config); }
  catch (e) { if (e instanceof McpError) throw e; throw new McpError(401, 'MCP_UNAUTHORIZED'); }
  // Reuse HighFive's existing hash/expiry/revocation checks. Never forward the OAuth token as an API key.
  const auth = await requireServiceAuth(new NextRequest('https://highfive.internal/api/mcp', { headers: { authorization: `Bearer ${config.serviceKey}` } }));
  if (auth.error) throw new McpError(403, 'MCP_SERVICE_ACCESS_DENIED');
  const credential = auth.credential;
  if (!serviceHasPermission(credential, 'READ') || credential.allowOrgWide || credential.projects.length === 0) throw new McpError(403, 'MCP_SERVICE_ACCESS_DENIED');
  const user = await prisma.user.findFirst({
    where: { id: config.userId, organizationId: auth.organizationId, isActive: true, role: { in: ['WORKER', 'LEADER', 'ADMIN'] }, organization: { isActive: true } },
    select: { id: true, name: true },
  });
  if (!user) throw new McpError(403, 'MCP_SERVICE_ACCESS_DENIED');
  return {
    organizationId: auth.organizationId, userId: user.id, credentialId: credential.id,
    projectIds: credential.projects.map(p => p.projectId),
    canCreate: config.tasksEnabled && scopes.includes(CREATE_SCOPE) && serviceHasPermission(credential, 'MCP_TASK_CREATE'),
    canComment: config.commentsEnabled && scopes.includes(COMMENT_SCOPE) && serviceHasPermission(credential, 'COMMENT_CREATE'),
  };
}
export type McpPrincipal = Awaited<ReturnType<typeof authenticateMcp>>;
