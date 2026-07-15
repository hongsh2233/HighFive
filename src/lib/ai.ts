import Anthropic from '@anthropic-ai/sdk';

let envClient: Anthropic | null = null;

function getEnvClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!envClient) envClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return envClient;
}

// apiKeyOverride: 조직이 설정 화면에서 등록한 Anthropic API 키(복호화된 평문).
// 등록되어 있으면 그 키를 우선 사용하고, 없으면 서버 env(ANTHROPIC_API_KEY)로 폴백한다.
export async function callClaude(prompt: string, maxTokens = 1024, apiKeyOverride?: string | null): Promise<string> {
  const anthropic = apiKeyOverride ? new Anthropic({ apiKey: apiKeyOverride }) : getEnvClient();
  if (!anthropic) {
    throw new Error('AI 기능을 사용하려면 조직 설정(AI 설정)에 Anthropic API 키를 등록하거나 ANTHROPIC_API_KEY 환경변수를 설정해야 합니다.');
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  return block?.type === 'text' ? block.text : '';
}
