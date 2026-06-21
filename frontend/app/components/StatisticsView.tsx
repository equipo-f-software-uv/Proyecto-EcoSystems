import { BarChart3, Droplets, TrendingDown, Calendar, Percent } from 'lucide-react';
import { useState, useEffect } from 'react';

// Datos simulados para los últimos 7 días (US-13)
const mockWeeklyData = [
  { day: 'Lun', water: 120, humidity: 65 },
  { day: 'Mar', water: 85, humidity: 68 },
  { day: 'Mie', water: 0, humidity: 75 }, // Día de lluvia simulado
  { day: 'Jue', water: 45, humidity: 70 },
  { day: 'Vie', water: 110, humidity: 62 },
  { day: 'Sab', water: 130, humidity: 58 },
  { day: 'Dom', water: 90, humidity: 64 },
];

export function StatisticsView() {
  const [weeklyData, setWeeklyData] = useState(mockWeeklyData);

  useEffect(() => {
    // Consumir la API real del backend (Node.js) para obtener históricos
    const fetchEstadisticas = async () => {
      try {
        const response = await fetch('http://localhost:8002/api/estadisticas');
        if (response.ok) {
          const result = await response.json();
          
          if (result.data && result.data.length > 0) {
            const diasSemana = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
            
            const formattedData = result.data.map((item: any) => {
              // Parseamos la fecha asegurando formato correcto
              const dateObj = new Date(item.date + 'T00:00:00');
              return {
                day: diasSemana[dateObj.getDay()],
                water: Math.round(item.water || 0),
                humidity: Math.round(item.humidity || 0)
              };
            });
            
            setWeeklyData(formattedData);
          }
        }
      } catch (error) {
        console.error("Error conectando con la API, usando mock fallback:", error);
      }
    };

    fetchEstadisticas();
  }, []);

  // Evitamos divisiones por cero con Math.max(1) por si no hay consumo de agua aún
  const maxWater = Math.max(1, ...weeklyData.map((d) => d.water));
  const totalWater = weeklyData.reduce((acc, curr) => acc + curr.water, 0);
  const avgHumidity = Math.round(weeklyData.reduce((acc, curr) => acc + curr.humidity, 0) / (weeklyData.length || 1));

  return (
    <div className="pb-6">
      {/* Cabecera */}
      <div className="bg-primary text-primary-foreground px-4 py-6 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8" />
          <div>
            <p className="text-sm opacity-75">EcoSystems</p>
            <h1>Análisis y Estadísticas</h1>
          </div>
        </div>
        <p className="text-sm opacity-90">Últimos 7 días</p>
      </div>

      <div className="px-4 mt-6">
        {/* KPIs (Key Performance Indicators) */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-water-light border border-water/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-water-dark mb-2">
              <Droplets className="w-5 h-5" />
              <p className="text-sm font-medium">Agua Total</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalWater} L</p>
            <div className="flex items-center gap-1 mt-2 text-plant-dark text-xs">
              <TrendingDown className="w-3 h-3" />
              <span>-12% vs sem. ant.</span>
            </div>
          </div>

          <div className="bg-plant-light border border-plant/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-plant-dark mb-2">
              <Percent className="w-5 h-5" />
              <p className="text-sm font-medium">Humedad Prom.</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{avgHumidity}%</p>
            <p className="mt-2 text-muted-foreground text-xs">Rango ideal: 60-70%</p>
          </div>
        </div>

        {/* Gráfico de Barras: Consumo de Agua */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-foreground text-lg">Consumo de Agua</h2>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          
          {/* Contenedor del Gráfico construido con Tailwind */}
          <div className="h-48 flex items-end justify-between gap-2">
            {weeklyData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="w-full flex justify-center group relative">
                  {/* Tooltip on hover */}
                  <span className="absolute -top-8 bg-foreground text-background text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {data.water}L
                  </span>
                  <div 
                    className="w-full max-w-[2rem] bg-water hover:bg-water-dark transition-colors rounded-t-sm"
                    style={{ 
                      height: `${(data.water / maxWater) * 100}%`,
                      minHeight: data.water > 0 ? '4px' : '0px'
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground mt-2">{data.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sugerencia / Insight */}
        <div className="bg-muted/50 border border-border rounded-xl p-4">
          <h3 className="text-foreground text-sm font-medium mb-2">💡 Resumen Semanal</h3>
          <p className="text-sm text-muted-foreground">
            El riego se mantuvo apagado automáticamente el día Miércoles debido a las lluvias.
            La humedad del suelo se ha mantenido en niveles óptimos, ahorrando un 12% de agua.
          </p>
        </div>
      </div>
    </div>
  );
}