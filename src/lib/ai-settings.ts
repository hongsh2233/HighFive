import { prisma } from './db';
import { decryptSecret } from './crypto';

export const AI_FEATURE_KEYS = [
  'taskDraft',
  'taskSummary',
  'aiSearch',
  'weeklyReport',
  'workloadInsight',
  'meetingSummary',
  'meetingToTask',
  'weatherGreeting',
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
