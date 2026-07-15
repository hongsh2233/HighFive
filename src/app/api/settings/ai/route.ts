import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, successResponse, errorResponse } from '@/lib/utils';
import { encryptSecret } from '@/lib/crypto';
import { AI_FEATURE_KEYS, AiFeatureKey, AiFeatureMap, emptyFeatureMap } from '@/lib/ai-settings';

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

    return successResponse({
      hasAnthropicKey: !!settings?.anthropicKeyEnc,
      hasWeatherKey: !!settings?.weatherKeyEnc,
      hasGithubToken: !!settings?.githubTokenEnc,
      weatherCity: settings?.weatherCity ?? null,
      features,
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
    const { anthropicKey, weatherKey, githubToken, weatherCity, features } = body as {
      anthropicKey?: string | null;
      weatherKey?: string | null;
      githubToken?: string | null;
      weatherCity?: string | null;
      features?: Partial<AiFeatureMap>;
    };

    const existing = await prisma.aiSettings.findUnique({ where: { organizationId } });

    // 키 입력값 결정: 문자열이 오면 새로 암호화, null이면 명시적 삭제, undefined면 기존 값 유지
    let anthropicKeyEnc = existing?.anthropicKeyEnc ?? null;
    if (anthropicKey === null) anthropicKeyEnc = null;
    else if (typeof anthropicKey === 'string' && anthropicKey.trim()) anthropicKeyEnc = encryptSecret(anthropicKey.trim());

    let weatherKeyEnc = existing?.weatherKeyEnc ?? null;
    if (weatherKey === null) weatherKeyEnc = null;
    else if (typeof weatherKey === 'string' && weatherKey.trim()) weatherKeyEnc = encryptSecret(weatherKey.trim());

    let githubTokenEnc = existing?.githubTokenEnc ?? null;
    if (githubToken === null) githubTokenEnc = null;
    else if (typeof githubToken === 'string' && githubToken.trim()) githubTokenEnc = encryptSecret(githubToken.trim());

    const finalCity = weatherCity === undefined ? (existing?.weatherCity ?? null) : (weatherCity?.trim() || null);

    const requestedFeatures: AiFeatureMap = { ...emptyFeatureMap(), ...((existing?.features as Partial<AiFeatureMap>) || {}), ...(features || {}) };

    // 키가 없는 상태에서 기능을 켜려는 시도는 거부
    for (const key of AI_FEATURE_KEYS) {
      if (!requestedFeatures[key]) continue;
      if (key === WEATHER_ONLY_FEATURE) {
        if (!weatherKeyEnc || !finalCity) {
          return errorResponse('날씨 인사말을 켜려면 날씨 API 키와 도시를 먼저 설정해야 합니다.', 400, 'VALID_400');
        }
      } else if (!anthropicKeyEnc) {
        return errorResponse('AI 기능을 켜려면 Anthropic API 키를 먼저 설정해야 합니다.', 400, 'VALID_400');
      }
    }

    const saved = await prisma.aiSettings.upsert({
      where: { organizationId },
      update: { anthropicKeyEnc, weatherKeyEnc, githubTokenEnc, weatherCity: finalCity, features: requestedFeatures },
      create: { organizationId, anthropicKeyEnc, weatherKeyEnc, githubTokenEnc, weatherCity: finalCity, features: requestedFeatures },
    });

    return successResponse({
      hasAnthropicKey: !!saved.anthropicKeyEnc,
      hasWeatherKey: !!saved.weatherKeyEnc,
      hasGithubToken: !!saved.githubTokenEnc,
      weatherCity: saved.weatherCity,
      features: requestedFeatures,
      updatedAt: saved.updatedAt,
    }, '저장되었습니다.');
  } catch (err) {
    console.error(err);
    return errorResponse('AI 설정 저장 중 오류가 발생했습니다.', 500);
  }
}
