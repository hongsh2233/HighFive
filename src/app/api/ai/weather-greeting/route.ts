import { requireAuth, successResponse, errorResponse } from '@/lib/utils';
import { getOrgAnthropicKey, getOrgWeatherConfig, isFeatureEnabled } from '@/lib/ai-settings';
import { fetchWeather } from '@/lib/weather';
import { callClaude } from '@/lib/ai';

// 같은 조직·같은 날짜에는 재호출하지 않는 간단한 인메모리 캐시(서버 프로세스 생존 동안만 유효)
const cache = new Map<string, { date: string; greeting: string }>();

// GET /api/ai/weather-greeting - 날씨 기반 짧은 인사 문구
export async function GET() {
  try {
    const { error, organizationId } = await requireAuth();
    if (error) return error;

    if (!(await isFeatureEnabled(organizationId, 'weatherGreeting'))) {
      return errorResponse('날씨 인사말 기능이 비활성화되어 있습니다.', 403, 'AI_DISABLED');
    }

    const { apiKey: weatherKey, city } = await getOrgWeatherConfig(organizationId);
    if (!weatherKey || !city) {
      return errorResponse('날씨 API 키 또는 도시가 설정되지 않았습니다.', 400, 'WEATHER_KEY_MISSING');
    }

    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `${organizationId}:${city}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.date === today) {
      return successResponse({ greeting: cached.greeting });
    }

    const weather = await fetchWeather(city, weatherKey);
    if (!weather) return errorResponse('날씨 정보를 가져오지 못했습니다.', 502, 'WEATHER_FETCH_FAILED');

    const anthropicKey = await getOrgAnthropicKey(organizationId);
    let greeting: string;
    if (anthropicKey) {
      const prompt = `오늘 ${weather.city}의 날씨는 ${weather.description}, 기온 ${weather.tempC}도다. 이 정보를 바탕으로 업무관리 도구 대시보드에 띄울 짧고 친근한 한국어 인사 문구를 1문장으로 작성하라(이모지 1개 포함 가능, 따옴표 없이).`;
      greeting = (await callClaude(prompt, 64, anthropicKey)).trim();
    } else {
      greeting = `오늘 ${weather.city} 날씨는 ${weather.description}, ${weather.tempC}°C입니다.`;
    }

    cache.set(cacheKey, { date: today, greeting });
    return successResponse({ greeting });
  } catch (err: any) {
    console.error(err);
    return errorResponse(err?.message || '날씨 인사말 생성 중 오류가 발생했습니다.', 500);
  }
}
