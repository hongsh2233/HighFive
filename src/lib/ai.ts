import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function callClaude(prompt: string, maxTokens = 1024): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) {
    throw new Error('AI 기능을 사용하려면 ANTHROPIC_API_KEY 환경변수가 필요합니다.');
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  return block?.type === 'text' ? block.text : '';
}
