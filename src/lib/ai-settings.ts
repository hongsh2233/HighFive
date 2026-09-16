import { prisma } from './db';
import { decryptSecret } from './crypto';
import type { LlmProvider } from './ai';

export const LLM_PROVIDERS: LlmProvider[] = ['ANTHROPIC', 'OPENAI', 'GEMINI', 'GROQ', 'NVIDIA'];

export const LLM_PROVIDER_LABEL: Record<LlmProvider, string> = {
  ANTHROPIC: 'Anthropic (Claude)',
  OPENAI: 'OpenAI (GPT)',
  GEMINI: 'Google (Gemini)',
  GROQ: 'Groq',
  NVIDIA: 'NVIDIA NIM',
};

export const AI_FEATURE_KEYS = [
  'taskDraft',
  'taskSummary',
  'aiSearch',
  'weeklyReport',
  'workloadInsight',
  'meetingSummary',
  'meetingToTask',
  'weatherGreeting',
  'docSummary',
] as const;

export type AiFeatureKey = (typeof AI_FEATURE_KEYS)[number];

export type AiFeatureMap = Record<AiFeatureKey, boolean>;

export function emptyFeatureMap(): AiFeatureMap {
  return AI_FEATURE_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as AiFeatureMap);
}

export async function getOrgAiSettings(organizationId?: number) {
  if (!organizationId) return null;
  return prisma.aiSettings.findUnique({ where: { organizationId } });
}

export async function getOrgAnthropicKey(organizationId?: number): Promise<string | null> {
  const settings = await getOrgAiSettings(organizationId);
  if (!settings?.anthropicKeyEnc) return null;
  return decryptSecret(settings.anthropicKeyEnc);
}

const PROVIDER_KEY_FIELD: Record<LlmProvider, 'anthropicKeyEnc' | 'openaiKeyEnc' | 'geminiKeyEnc' | 'groqKeyEnc' | 'nvidiaKeyEnc'> = {
  ANTHROPIC: 'anthropicKeyEnc',
  OPENAI: 'openaiKeyEnc',
  GEMINI: 'geminiKeyEnc',
  GROQ: 'groqKeyEnc',
  NVIDIA: 'nvidiaKeyEnc',
};

export async function getOrgProviderKey(organizationId: number | undefined, provider: LlmProvider): Promise<string | null> {
  const settings = await getOrgAiSettings(organizationId);
  const enc = settings?.[PROVIDER_KEY_FIELD[provider]];
  if (!enc) return null;
  return decryptSecret(enc);
}

// 등록된 키가 있는 프로바이더 목록 (등록 순서: Anthropic > OpenAI > Gemini)
export async function getAvailableProviders(organizationId?: number): Promise<LlmProvider[]> {
  const settings = await getOrgAiSettings(organizationId);
  if (!settings) return [];
  const result: LlmProvider[] = [];
  if (settings.anthropicKeyEnc) result.push('ANTHROPIC');
  if (settings.openaiKeyEnc) result.push('OPENAI');
  if (settings.geminiKeyEnc) result.push('GEMINI');
  if (settings.groqKeyEnc) result.push('GROQ');
  if (settings.nvidiaKeyEnc) result.push('NVIDIA');
  return result;
}

// 기능별 사용 프로바이더를 조회하고, 없으면 등록된 키 중 첫번째로 폴백한다.
// 반환값이 null이면 사용 가능한 프로바이더/키가 전혀 없다는 뜻.
export async function getFeatureProvider(
  organizationId: number | undefined,
  featureKey: string
): Promise<{ provider: LlmProvider; apiKey: string } | null> {
  const settings = await getOrgAiSettings(organizationId);
  if (!settings) return null;

  const featureProviders = (settings.featureProviders as Record<string, LlmProvider>) || {};
  const preferred = featureProviders[featureKey];

  const available = await getAvailableProviders(organizationId);
  if (available.length === 0) return null;

  const provider = preferred && available.includes(preferred) ? preferred : available[0];
  const apiKey = await getOrgProviderKey(organizationId, provider);
  if (!apiKey) return null;
  return { provider, apiKey };
}

export async function getOrgGithubToken(organizationId?: number): Promise<string | null> {
  const settings = await getOrgAiSettings(organizationId);
  if (!settings?.githubTokenEnc) return null;
  return decryptSecret(settings.githubTokenEnc);
}

export async function getOrgWeatherConfig(organizationId?: number): Promise<{ apiKey: string | null; city: string | null }> {
  const settings = await getOrgAiSettings(organizationId);
  if (!settings) return { apiKey: null, city: null };
  return {
    apiKey: settings.weatherKeyEnc ? decryptSecret(settings.weatherKeyEnc) : null,
    city: settings.weatherCity ?? null,
  };
}

export async function isFeatureEnabled(organizationId: number | undefined, feature: AiFeatureKey): Promise<boolean> {
  const settings = await getOrgAiSettings(organizationId);
  if (!settings) return false;
  const features = (settings.features as Partial<AiFeatureMap>) || {};
  return !!features[feature];
}
