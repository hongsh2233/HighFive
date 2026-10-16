export const READ_SCOPE = 'highfive:read';
export const CREATE_SCOPE = 'highfive:task:create';
export const COMMENT_SCOPE = 'highfive:comment';
export class McpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
function httpsUrl(value: string | undefined): string {
  try {
    const url = new URL(value || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) throw new Error();
    return value!;
  } catch { throw new McpError(503, 'MCP_NOT_CONFIGURED'); }
}
export function getMcpConfig() {
  if (process.env.HIGHFIVE_MCP_ENABLED !== 'true') throw new McpError(503, 'MCP_DISABLED');
  const userId = Number(process.env.HIGHFIVE_MCP_USER_ID);
  const subject = process.env.HIGHFIVE_MCP_OAUTH_SUBJECT;
  const serviceKey = process.env.HIGHFIVE_MCP_SERVICE_KEY;
  if (!Number.isSafeInteger(userId) || userId < 1 || userId > 2147483647 || !subject || !serviceKey) throw new McpError(503, 'MCP_NOT_CONFIGURED');
  return {
    resource: httpsUrl(process.env.HIGHFIVE_MCP_RESOURCE_URL),
    issuer: httpsUrl(process.env.HIGHFIVE_MCP_OAUTH_ISSUER),
    jwks: httpsUrl(process.env.HIGHFIVE_MCP_OAUTH_JWKS_URL),
    subject, serviceKey, userId,
    tasksEnabled: process.env.HIGHFIVE_MCP_TASKS_ENABLED === 'true',
    commentsEnabled: process.env.HIGHFIVE_MCP_COMMENTS_ENABLED === 'true',
  };
}
export type McpConfig = ReturnType<typeof getMcpConfig>;
