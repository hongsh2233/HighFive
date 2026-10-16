import { getMcpConfig, READ_SCOPE, COMMENT_SCOPE, CREATE_SCOPE } from '@/lib/mcp/config';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const config = getMcpConfig();
    return Response.json({ resource: config.resource, authorization_servers: [config.issuer],
      scopes_supported: [READ_SCOPE, ...(config.commentsEnabled ? [COMMENT_SCOPE] : []), ...(config.tasksEnabled ? [CREATE_SCOPE] : [])],
      bearer_methods_supported: ['header'] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'MCP_NOT_CONFIGURED' }, { status: 503 }); }
}
