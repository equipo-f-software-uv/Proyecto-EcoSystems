export type WeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'stormy';

export interface ForecastDay {
  day: string;
  date: string;
  tempMax: number;
  tempMin: number;
  condition: WeatherCondition;
  rainProbability: number;
  humidity: number;
  windSpeed: number;
}

export interface WeatherSnapshot {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  precipitation: number;
  condition: WeatherCondition;
  updatedAt: number;
  forecast: ForecastDay[];
}

export type RecommendationLevel = 'skip' | 'reduce' | 'normal' | 'increase';

export interface IrrigationRecommendation {
  level: RecommendationLevel;
  title: string;
  message: string;
  adjustmentPct: number;
  reasons: string[];
  urgent: boolean;
}

export const BASE_WEATHER: WeatherSnapshot = {
  location: 'Valparaíso, Chile',
  temperature: 18,
  feelsLike: 17,
  humidity: 78,
  windSpeed: 15,
  uvIndex: 4,
  precipitation: 0,
  condition: 'partly_cloudy',
  updatedAt: Date.now(),
  forecast: [
    { day: 'Lun', date: '20 Jun', tempMax: 19, tempMin: 11, condition: 'partly_cloudy', rainProbability: 10, humidity: 75, windSpeed: 12 },
    { day: 'Mar', date: '21 Jun', tempMax: 17, tempMin: 10, condition: 'cloudy',         rainProbability: 40, humidity: 82, windSpeed: 18 },
    { day: 'Mié', date: '22 Jun', tempMax: 14, tempMin: 8,  condition: 'rainy',          rainProbability: 85, humidity: 90, windSpeed: 25 },
    { day: 'Jue', date: '23 Jun', tempMax: 13, tempMin: 7,  condition: 'stormy',         rainProbability: 95, humidity: 95, windSpeed: 30 },
    { day: 'Vie', date: '24 Jun', tempMax: 15, tempMin: 9,  condition: 'cloudy',         rainProbability: 50, humidity: 80, windSpeed: 20 },
    { day: 'Sáb', date: '25 Jun', tempMax: 18, tempMin: 10, condition: 'partly_cloudy', rainProbability: 20, humidity: 70, windSpeed: 14 },
    { day: 'Dom', date: '26 Jun', tempMax: 20, tempMin: 12, condition: 'sunny',          rainProbability: 5,  humidity: 60, windSpeed: 10 },
  ],
};

export function computeRecommendation(w: WeatherSnapshot): IrrigationRecommendation {
  const reasons: string[] = [];
  let score = 0;

  const next2days   = w.forecast.slice(0, 2);
  const rainSoon    = next2days.some(d => d.rainProbability >= 60);
  const heavyRain   = next2days.some(d => d.rainProbability >= 80);

  if (heavyRain) {
    score -= 80;
    const day = w.forecast.find(d => d.rainProbability >= 80)!;
    reasons.push(`Lluvia intensa pronostatica el ${day.day} (${day.rainProbability}% de probabilidad)`);
  } else if (rainSoon) {
    score -= 40;
    const day = w.forecast.find(d => d.rainProbability >= 60)!;
    reasons.push(`Probabilidad de lluvia el ${day.day}: ${day.rainProbability}%`);
  }

  if (w.humidity >= 80) {
    score -= 20;
    reasons.push(`Humedad ambiental alta (${w.humidity}%)`);
  } else if (w.humidity < 40) {
    score += 15;
    reasons.push(`Humedad ambiental baja (${w.humidity}%) — mayor evapotranspiración`);
  }

  const today = w.forecast[0];
  if (today && today.tempMax <= 15) {
    score -= 15;
    reasons.push(`Temperatura máxima baja (${today.tempMax}°C) — evapotranspiración reducida`);
  } else if (today && today.tempMax >= 32) {
    score += 20;
    reasons.push(`Temperatura máxima elevada (${today.tempMax}°C) — mayor demanda hídrica`);
  }

  if (w.windSpeed >= 25) {
    score += 10;
    reasons.push(`Viento fuerte (${w.windSpeed} km/h) — mayor pérdida por evaporación`);
  }

  const dryDaysAhead = w.forecast.filter(d => d.rainProbability < 20).length;
  if (dryDaysAhead >= 5) {
    score += 20;
    reasons.push(`${dryDaysAhead} días secos consecutivos en el pronóstico`);
  }

  let level: RecommendationLevel;
  let adjustmentPct: number;
  let title: string;
  let message: string;
  let urgent = false;

  if (score <= -60) {
    level = 'skip'; adjustmentPct = -100; urgent = true;
    title = 'Suspender el riego hoy';
    message = 'Las condiciones climáticas hacen innecesario el riego. Se esperan precipitaciones que aportarán suficiente agua al suelo.';
  } else if (score <= -20) {
    level = 'reduce'; adjustmentPct = Math.round(Math.max(-60, score * 0.6));
    title = `Reducir el riego un ${Math.abs(adjustmentPct)}%`;
    message = 'Las condiciones actuales y el pronóstico sugieren reducir el volumen de agua para evitar sobre-riego y optimizar el recurso hídrico.';
  } else if (score >= 25) {
    level = 'increase'; adjustmentPct = Math.round(Math.min(30, score * 0.3));
    title = `Aumentar el riego un ${adjustmentPct}%`;
    message = 'Las condiciones de alta temperatura o baja humedad ambiental demandan mayor aporte hídrico para mantener el nivel óptimo del suelo.';
  } else {
    level = 'normal'; adjustmentPct = 0;
    title = 'Riego normal recomendado';
    message = 'Las condiciones climáticas son adecuadas. Mantén el programa de riego habitual según los umbrales de humedad configurados.';
  }

  if (reasons.length === 0) reasons.push('Condiciones climáticas estables');
  return { level, title, message, adjustmentPct, reasons, urgent };
}
