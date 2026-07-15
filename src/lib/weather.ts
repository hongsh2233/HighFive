export interface WeatherInfo {
  city: string;
  tempC: number;
  description: string;
}

// OpenWeatherMap Current Weather API 호출 (조직이 등록한 키 사용)
export async function fetchWeather(city: string, apiKey: string): Promise<WeatherInfo | null> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=kr`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      city,
      tempC: Math.round(data.main?.temp ?? 0),
      description: data.weather?.[0]?.description ?? '',
    };
  } catch {
    return null;
  }
}
