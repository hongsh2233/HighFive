import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { getMcpConfig, McpError, READ_SCOPE } from '@/lib/mcp/config';
import { authenticateMcp } from '@/lib/mcp/auth';
import { auditMcp } from '@/lib/mcp/audit';
import { createMcpServer } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BYTES = 65536;
async function boundedJson(req: Request) {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new McpError(415, 'JSON_REQUIRED');
  if (Number(req.headers.get('content-length')) > MAX_BYTES) throw new McpError(413, 'REQUEST_TOO_LARGE');
  const reader = req.body?.getReader();
  if (!reader) throw new McpError(400, 'INVALID_JSON');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new McpError(413, 'REQUEST_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new McpError(400, 'INVALID_JSON'); }
}
export async function POST(req: Request) {
  let config: ReturnType<typeof getMcpConfig> | undefined;
  let server: ReturnType<typeof createMcpServer> | undefined;
  try {
    config = getMcpConfig();
    const origin = req.headers.get('origin');
    // Never trust forwarded Host or Origin as a configuration source.
    if (origin && origin !== new URL(config.resource).origin) throw new McpError(403, 'ORIGIN_FORBIDDEN');
    const principal = await authenticateMcp(req, config);
    const body = await boundedJson(req);
    if (Array.isArray(body)) throw new McpError(400, 'BATCH_UNSUPPORTED');
    await auditMcp('REQUEST', 'AUTHENTICATED', principal);
    server = createMcpServer(principal, config);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    const response = await transport.handleRequest(req, { parsedBody: body });
    // JSON mode is fully materialized before cleanup; no long-lived SSE sessions.
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (e) {
    const error = e instanceof McpError ? e : new McpError(503, 'MCP_UNAVAILABLE');
    try { await auditMcp('REQUEST', error.code); } catch { /* No protected data returned if audit fails. */ }
    return Response.json({ error: error.code }, { status: error.status, headers: {
      'Cache-Control': 'no-store',
      ...(error.status === 401 && config ? { 'WWW-Authenticate': `Bearer resource_metadata="${new URL('/.well-known/oauth-protected-resource', config.resource).href}", scope="${READ_SCOPE}"` } : {}),
    } });
  } finally { await server?.close(); }
}
// Stateless JSON transport intentionally has no persistent GET stream or DELETE session.
export async function GET() { return new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } }); }
export const DELETE = GET;
