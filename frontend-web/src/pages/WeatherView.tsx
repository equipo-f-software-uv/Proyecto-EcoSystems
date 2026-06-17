import { Cloud, CloudRain, Sun, Wind, Droplets, Eye } from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: 'sunny' | 'cloudy' | 'rainy';
  precipitation: number;
  visibility: number;
  forecast: Array<{
    day: string;
    temp: number;
    condition: 'sunny' | 'cloudy' | 'rainy';
    rain: number;
  }>;
}

const mockWeatherData: WeatherData = {
  location: 'Santiago, Chile',
  temperature: 24,
  humidity: 65,
  windSpeed: 12,
  condition: 'sunny',
  precipitation: 0,
  visibility: 10,
  forecast: [
    { day: 'Lun', temp: 25, condition: 'sunny', rain: 0 },
    { day: 'Mar', temp: 23, condition: 'cloudy', rain: 10 },
    { day: 'Mie', temp: 20, condition: 'rainy', rain: 75 },
    { day: 'Jue', temp: 22, condition: 'cloudy', rain: 30 },
    { day: 'Vie', temp: 26, condition: 'sunny', rain: 0 },
  ],
};

export function WeatherView() {
  const weather = mockWeatherData;

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return <Sun className="w-12 h-12 text-yellow-500" />;
      case 'cloudy':
        return <Cloud className="w-12 h-12 text-gray-400" />;
      case 'rainy':
        return <CloudRain className="w-12 h-12 text-water" />;
      default:
        return <Sun className="w-12 h-12 text-yellow-500" />;
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return 'Despejado';
      case 'cloudy':
        return 'Nublado';
      case 'rainy':
        return 'Lluvia';
      default:
        return 'Despejado';
    }
  };

  return (
    <div className="pb-6">
      <div className="bg-primary text-primary-foreground px-4 py-6 shadow-md">
        <p className="text-sm opacity-75">EcoSystems</p>
        <h1>Clima</h1>
        <p className="text-sm opacity-90">{weather.location}</p>
      </div>

      <div className="px-4 mt-6">
        <div className="bg-gradient-to-br from-water to-water-dark text-white rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-5xl mb-2">{weather.temperature}°</p>
              <p className="text-lg opacity-90">{getConditionText(weather.condition)}</p>
            </div>
            <div>
              {getWeatherIcon(weather.condition)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-4 h-4" />
                <p className="text-xs opacity-80">Humedad</p>
              </div>
              <p className="text-lg">{weather.humidity}%</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="w-4 h-4" />
                <p className="text-xs opacity-80">Viento</p>
              </div>
              <p className="text-lg">{weather.windSpeed} km/h</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4" />
                <p className="text-xs opacity-80">Visibilidad</p>
              </div>
              <p className="text-lg">{weather.visibility} km</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <h3 className="mb-4 text-foreground">Pronóstico de 5 días</h3>
          <div className="space-y-3">
            {weather.forecast.map((day, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <p className="w-12 text-foreground">{day.day}</p>
                  <div className="flex-shrink-0">
                    {getWeatherIcon(day.condition)}
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">{getConditionText(day.condition)}</p>
                    {day.rain > 0 && (
                      <p className="text-xs text-water">Lluvia: {day.rain}%</p>
                    )}
                  </div>
                </div>
                <p className="text-foreground text-lg">{day.temp}°</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-plant-light border border-plant rounded-lg p-4">
          <h3 className="text-plant-dark mb-2">💡 Información del clima</h3>
          <p className="text-sm text-foreground">
            Los datos climáticos se actualizan cada hora. Puedes configurar tu ubicación
            en la configuración para obtener información más precisa de tu zona de cultivo.
          </p>
        </div>
      </div>
    </div>
  );
}