import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { encryptSecret } from '@/lib/crypto';
import { AI_FEATURE_KEYS, AiFeatureKey, AiFeatureMap, emptyFeatureMap, LLM_PROVIDERS } from '@/lib/ai-settings';
import type { LlmProvider } from '@/lib/ai';

const WEATHER_ONLY_FEATURE: AiFeatureKey = 'weatherGreeting';

// GET /api/settings/ai - AI 설정 조회 (ADMIN 전용, 키 값 자체는 절대 반환하지 않음)
export async function GET() {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;

    const settings = organizationId
      ? await prisma.aiSettings.findUnique({ where: { organizationId } })
      : null;
    const features: AiFeatureMap = { ...emptyFeatureMap(), ...((settings?.features as Partial<AiFeatureMap>) || {}) };
    const featureProviders: Partial<Record<AiFeatureKey, LlmProvider>> = (settings?.featureProviders as any) || {};

    return successResponse({
      hasAnthropicKey: !!settings?.anthropicKeyEnc,
      hasOpenaiKey: !!settings?.openaiKeyEnc,
      hasGeminiKey: !!settings?.geminiKeyEnc,
      hasGroqKey: !!settings?.groqKeyEnc,
      hasNvidiaKey: !!settings?.nvidiaKeyEnc,
      hasWeatherKey: !!settings?.weatherKeyEnc,
      hasGithubToken: !!settings?.githubTokenEnc,
      weatherCity: settings?.weatherCity ?? null,
      features,
      featureProviders,
      updatedAt: settings?.updatedAt ?? null,
    }, 'AI 설정 조회 완료');
  } catch (err) {
    console.error(err);
    return errorResponse('AI 설정 조회 중 오류가 발생했습니다.', 500);
  }
}

// PUT /api/settings/ai - AI 설정 저장 (ADMIN 전용)
export async function PUT(req: NextRequest) {
  try {
    const { error, organizationId } = await requireRole(['ADMIN']);
    if (error) return error;
    if (!organizationId) return errorResponse('조직 정보를 확인할 수 없습니다.', 400, 'VALID_400');

    const body = await req.json();
    const { anthropicKey, openaiKey, geminiKey, groqKey, nvidiaKey, weatherKey, githubToken, weatherCity, features, featureProviders } = body as {
      anthropicKey?: string | null;
      openaiKey?: string | null;
      geminiKey?: string | null;
      groqKey?: string | null;
      nvidiaKey?: string | null;
      weatherKey?: string | null;
      githubToken?: string | null;
      weatherCity?: string | null;
      features?: Partial<AiFeatureMap>;
      featureProviders?: Partial<Record<AiFeatureKey, LlmProvider>>;
    };

    const existing = await prisma.aiSettings.findUnique({ where: { organizationId } });

    // 키 입력값 결정: 문자열이 오면 새로 암호화, null이면 명시적 삭제, undefined면 기존 값 유지
    const resolveKey = (input: string | null | undefined, current: string | null | undefined) => {
      if (input === null) return null;
      if (typeof input === 'string' && input.trim()) return encryptSecret(input.trim());
      return current ?? null;
    };

    const anthropicKeyEnc = resolveKey(anthropicKey, existing?.anthropicKeyEnc);
    const openaiKeyEnc = resolveKey(openaiKey, existing?.openaiKeyEnc);
    const geminiKeyEnc = resolveKey(geminiKey, existing?.geminiKeyEnc);
    const groqKeyEnc = resolveKey(groqKey, existing?.groqKeyEnc);
    const nvidiaKeyEnc = resolveKey(nvidiaKey, existing?.nvidiaKeyEnc);
    const weatherKeyEnc = resolveKey(weatherKey, existing?.weatherKeyEnc);
    const githubTokenEnc = resolveKey(githubToken, existing?.githubTokenEnc);

    const finalCity = weatherCity === undefined ? (existing?.weatherCity ?? null) : (weatherCity?.trim() || null);

    const requestedFeatures: AiFeatureMap = { ...emptyFeatureMap(), ...((existing?.features as Partial<AiFeatureMap>) || {}), ...(features || {}) };
    const requestedFeatureProviders: Partial<Record<AiFeatureKey, LlmProvider>> = {
      ...((existing?.featureProviders as any) || {}),
      ...(featureProviders || {}),
    };

    const hasAnyLlmKey = !!(anthropicKeyEnc || openaiKeyEnc || geminiKeyEnc || groqKeyEnc || nvidiaKeyEnc);

    // 키가 없는 상태에서 기능을 켜려는 시도는 거부
    for (const key of AI_FEATURE_KEYS) {
      if (!requestedFeatures[key]) continue;
      if (key === WEATHER_ONLY_FEATURE) {
        if (!weatherKeyEnc || !finalCity) {
          return errorResponse('날씨 인사말을 켜려면 날씨 API 키와 도시를 먼저 설정해야 합니다.', 400, 'VALID_400');
        }
      } else if (!hasAnyLlmKey) {
        return errorResponse('AI 기능을 켜려면 API 키를 먼저 설정해야 합니다.', 400, 'VALID_400');
      } else {
        const provider = requestedFeatureProviders[key];
        if (provider && !LLM_PROVIDERS.includes(provider)) {
          return errorResponse('올바르지 않은 프로바이더입니다.', 400, 'VALID_400');
        }
      }
    }

    const saved = await prisma.aiSettings.upsert({
      where: { organizationId },
      update: { anthropicKeyEnc, openaiKeyEnc, geminiKeyEnc, groqKeyEnc, nvidiaKeyEnc, weatherKeyEnc, githubTokenEnc, weatherCity: finalCity, features: requestedFeatures, featureProviders: requestedFeatureProviders },
      create: { organizationId, anthropicKeyEnc, openaiKeyEnc, geminiKeyEnc, groqKeyEnc, nvidiaKeyEnc, weatherKeyEnc, githubTokenEnc, weatherCity: finalCity, features: requestedFeatures, featureProviders: requestedFeatureProviders },
    });

    return successResponse({
      hasAnthropicKey: !!saved.anthropicKeyEnc,
      hasOpenaiKey: !!saved.openaiKeyEnc,
      hasGeminiKey: !!saved.geminiKeyEnc,
      hasGroqKey: !!saved.groqKeyEnc,
      hasNvidiaKey: !!saved.nvidiaKeyEnc,
      hasWeatherKey: !!saved.weatherKeyEnc,
      hasGithubToken: !!saved.githubTokenEnc,
      weatherCity: saved.weatherCity,
      features: requestedFeatures,
      featureProviders: requestedFeatureProviders,
      updatedAt: saved.updatedAt,
    }, '저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('AI 설정 저장 중 오류가 발생했습니다.', 500);
  }
}
