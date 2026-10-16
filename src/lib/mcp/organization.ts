// This MCP integration belongs exclusively to EXAWAVE, independently of the OAuth login.
export const MCP_ORGANIZATION_SLUG = 'exawave';
export const MCP_AUTHORIZATION_PATH = '/mcp-auth/realms/exawave-mcp/protocol/openid-connect/auth';

export function mcpLoginReturn(value: string | null): string | null {
  if (!value || value.length > 8192 || !value.startsWith(`${MCP_AUTHORIZATION_PATH}?`)) return null;
  try {
    const url = new URL(value, 'https://highfive.internal');
    if (url.origin !== 'https://highfive.internal' || url.pathname !== MCP_AUTHORIZATION_PATH || url.hash) return null;
    return url.pathname + url.search;
  } catch { return null; }
}
