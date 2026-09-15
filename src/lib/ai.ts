import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type LlmProvider = 'ANTHROPIC' | 'OPENAI' | 'GEMINI' | 'GROQ';

let envAnthropicClient: Anthropic | null = null;

function getEnvAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!envAnthropicClient) envAnthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return envAnthropicClient;
}

async function callAnthropic(prompt: string, maxTokens: number, apiKeyOverride?: string | null): Promise<string> {
  const anthropic = apiKeyOverride ? new Anthropic({ apiKey: apiKeyOverride }) : getEnvAnthropicClient();
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

async function callOpenAI(prompt: string, maxTokens: number, apiKey?: string | null): Promise<string> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('AI 기능을 사용하려면 조직 설정(AI 설정)에 OpenAI API 키를 등록해야 합니다.');
  }
  const client = new OpenAI({ apiKey: key });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.choices[0]?.message?.content || '';
}

async function callGroq(prompt: string, maxTokens: number, apiKey?: string | null): Promise<string> {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('AI 기능을 사용하려면 조직 설정(AI 설정)에 Groq API 키를 등록해야 합니다.');
  }
  const client = new OpenAI({ apiKey: key, baseURL: 'https://api.groq.com/openai/v1' });
  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.choices[0]?.message?.content || '';
}

async function callGemini(prompt: string, maxTokens: number, apiKey?: string | null): Promise<string> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('AI 기능을 사용하려면 조직 설정(AI 설정)에 Gemini API 키를 등록해야 합니다.');
  }
  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig: { maxOutputTokens: maxTokens } });
  const result = await model.generateContent(prompt);
  return result.response.text() || '';
}

// provider별로 등록된(또는 override된) API 키를 사용해 LLM을 호출한다.
export async function callLLM(
  provider: LlmProvider,
  prompt: string,
  maxTokens = 1024,
  apiKeyOverride?: string | null
): Promise<string> {
  switch (provider) {
    case 'OPENAI':
      return callOpenAI(prompt, maxTokens, apiKeyOverride);
    case 'GEMINI':
      return callGemini(prompt, maxTokens, apiKeyOverride);
    case 'GROQ':
      return callGroq(prompt, maxTokens, apiKeyOverride);
    case 'ANTHROPIC':
    default:
      return callAnthropic(prompt, maxTokens, apiKeyOverride);
  }
}

// 하위호환: 기존 호출부가 남아있을 경우를 위한 wrapper
export async function callClaude(prompt: string, maxTokens = 1024, apiKeyOverride?: string | null): Promise<string> {
  return callLLM('ANTHROPIC', prompt, maxTokens, apiKeyOverride);
}
