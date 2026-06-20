import { useState, useEffect } from 'react';
import {
  Cloud, CloudRain, Sun, Wind, Droplets, Thermometer,
  RefreshCw, Zap, CheckCircle2, TrendingDown, TrendingUp,
  Minus, ShieldCheck, AlertTriangle, CloudLightning,
  CloudSun, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  BASE_WEATHER, computeRecommendation,
  type WeatherSnapshot, type WeatherCondition,
  type IrrigationRecommendation, type RecommendationLevel,
} from '../weather';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function conditionIcon(c: WeatherCondition, size = 'w-6 h-6') {
  switch (c) {
    case 'sunny':        return <Sun className={`${size} text-yellow-400`} />;
    case 'partly_cloudy':return <CloudSun className={`${size} text-yellow-300`} />;
    case 'cloudy':       return <Cloud className={`${size} text-gray-400`} />;
    case 'rainy':        return <CloudRain className={`${size} text-blue-400`} />;
    case 'stormy':       return <CloudLightning className={`${size} text-purple-400`} />;
  }
}

function conditionLabel(c: WeatherCondition) {
  const map: Record<WeatherCondition, string> = {
    sunny: 'Despejado', partly_cloudy: 'Parcialmente nublado',
    cloudy: 'Nublado', rainy: 'Lluvia', stormy: 'Tormenta',
  };
  return map[c];
}

const LEVEL_CONFIG: Record<RecommendationLevel, {
  bg: string; border: string; titleColor: string;
  icon: React.ReactNode; badgeBg: string; badgeText: string;
}> = {
  skip:     { bg: 'bg-blue-50',   border: 'border-blue-300',  titleColor: 'text-blue-800',  icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,     badgeBg: 'bg-blue-100',   badgeText: 'text-blue-700' },
  reduce:   { bg: 'bg-amber-50',  border: 'border-amber-300', titleColor: 'text-amber-800', icon: <TrendingDown className="w-6 h-6 text-amber-600" />,   badgeBg: 'bg-amber-100',  badgeText: 'text-amber-700' },
  normal:   { bg: 'bg-green-50',  border: 'border-green-300', titleColor: 'text-green-800', icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,   badgeBg: 'bg-green-100',  badgeText: 'text-green-700' },
  increase: { bg: 'bg-orange-50', border: 'border-orange-300',titleColor: 'text-orange-800',icon: <TrendingUp className="w-6 h-6 text-orange-600" />,    badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' },
};

function adjLabel(pct: number) {
  if (pct === 0)    return <span className="flex items-center gap-1"><Minus className="w-3.5 h-3.5" />Sin cambio</span>;
  if (pct === -100) return <span className="flex items-center gap-1 text-blue-700"><TrendingDown className="w-3.5 h-3.5" />Suspender</span>;
  if (pct < 0)      return <span className="flex items-center gap-1 text-amber-700"><TrendingDown className="w-3.5 h-3.5" />{Math.abs(pct)}% menos</span>;
  return              <span className="flex items-center gap-1 text-orange-700"><TrendingUp className="w-3.5 h-3.5" />+{pct}% más</span>;
}

function rainColor(p: number) {
  if (p >= 70) return '#3b82f6';
  if (p >= 40) return '#93c5fd';
  return '#bfdbfe';
}

// ─── Recommendation card ─────────────────────────────────────────────────────

function RecommendationCard({ rec }: { rec: IrrigationRecommendation }) {
  const cfg = LEVEL_CONFIG[rec.level];
  return (
    <div className={`rounded-xl border-2 p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 mt-0.5">{cfg.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={`${cfg.titleColor}`}>{rec.title}</h3>
            {rec.urgent && (
              <span className="flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />Urgente
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{rec.message}</p>
        </div>
        <div className={`shrink-0 text-xs px-2 py-1 rounded-full ${cfg.badgeBg} ${cfg.badgeText} font-medium`}>
          {adjLabel(rec.adjustmentPct)}
        </div>
      </div>

      {/* Reasons */}
      <div className="mt-3 pt-3 border-t border-black/10 space-y-1">
        <p className="text-xs font-medium text-foreground/60 mb-1.5">Factores considerados:</p>
        {rec.reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/70">
            <span className="w-1.5 h-1.5 rounded-full bg-current mt-1 shrink-0" />
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rain probability chart tooltip ──────────────────────────────────────────

function RainTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-medium text-foreground">{d.day} {d.date}</p>
      <p className="text-blue-600 mt-1">Lluvia: {d.rainProbability}%</p>
      <p className="text-muted-foreground">Humedad: {d.humidity}%</p>
      <p className="text-muted-foreground">Temp: {d.tempMin}°–{d.tempMax}°C</p>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function WeatherView() {
  const [weather, setWeather] = useState<WeatherSnapshot>({ ...BASE_WEATHER, updatedAt: Date.now() });
  const [refreshing, setRefreshing] = useState(false);
  const rec = computeRecommendation(weather);

  // Simulate periodic sensor refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setWeather(prev => ({
        ...prev,
        temperature: prev.temperature + Math.round((Math.random() - 0.5) * 3),
        humidity: Math.min(100, Math.max(20, prev.humidity + Math.round((Math.random() - 0.5) * 5))),
        windSpeed: Math.max(0, prev.windSpeed + Math.round((Math.random() - 0.5) * 4)),
        updatedAt: Date.now(),
      }));
      setRefreshing(false);
    }, 900);
  };

  // Auto-refresh every 5 min (simulated)
  useEffect(() => {
    const id = setInterval(handleRefresh, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  const chartData = weather.forecast.map(d => ({ ...d, fill: rainColor(d.rainProbability) }));

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-75">EcoSystems</p>
            <h1>Clima & Recomendaciones</h1>
            <p className="text-sm opacity-90">{weather.location}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Actualizando…' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      <div className="px-4 mt-6 max-w-2xl space-y-5">

        {/* ── Current conditions ── */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-5 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-6xl font-light mb-1">{weather.temperature}°</p>
              <p className="opacity-90">{conditionLabel(weather.condition)}</p>
              <p className="text-sm opacity-70 mt-1">Sensación: {weather.feelsLike}°C</p>
            </div>
            {conditionIcon(weather.condition, 'w-16 h-16')}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Droplets className="w-4 h-4" />, label: 'Humedad', value: `${weather.humidity}%` },
              { icon: <Wind className="w-4 h-4" />,     label: 'Viento',  value: `${weather.windSpeed}km/h` },
              { icon: <Thermometer className="w-4 h-4" />, label: 'UV',   value: String(weather.uvIndex) },
              { icon: <Eye className="w-4 h-4" />,      label: 'Precip', value: `${weather.precipitation}mm` },
            ].map(({ icon, label, value }) => (
              <div key={label} className="bg-white/20 rounded-lg p-2 text-center">
                <div className="flex justify-center mb-1">{icon}</div>
                <p className="text-xs opacity-75">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs opacity-50 mt-3 text-right">
            Actualizado: {new Date(weather.updatedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* ── Irrigation recommendation ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="text-foreground">Recomendación de riego</h3>
            <span className="text-xs text-muted-foreground">· Modelo predictivo activo</span>
          </div>
          <RecommendationCard rec={rec} />
        </div>

        {/* ── 7-day rain probability chart ── */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-foreground mb-1">Pronóstico de lluvia — 7 días</h3>
          <p className="text-xs text-muted-foreground mb-4">Probabilidad de precipitación por día</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart key="rain-forecast" data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<RainTooltip />} />
              <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 2"
                label={{ value: 'umbral 60%', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
              <Bar dataKey="rainProbability" name="Prob. lluvia" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={`cell-${i}`} fill={rainColor(d.rainProbability)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── 7-day detailed forecast ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-foreground">Pronóstico detallado</h3>
          </div>
          <div className="divide-y divide-border">
            {weather.forecast.map((day, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 shrink-0">
                  <p className="text-sm text-foreground font-medium">{day.day}</p>
                  <p className="text-xs text-muted-foreground">{day.date}</p>
                </div>
                <div className="shrink-0">{conditionIcon(day.condition)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{conditionLabel(day.condition)}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {day.rainProbability > 0 && (
                      <span className="text-xs text-blue-600 flex items-center gap-0.5">
                        <Droplets className="w-3 h-3" />{day.rainProbability}%
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Wind className="w-3 h-3" />{day.windSpeed}km/h
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-foreground">{day.tempMax}°</p>
                  <p className="text-xs text-muted-foreground">{day.tempMin}°</p>
                </div>
                {/* Rain probability bar */}
                <div className="w-16 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${day.rainProbability}%`, background: rainColor(day.rainProbability) }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}