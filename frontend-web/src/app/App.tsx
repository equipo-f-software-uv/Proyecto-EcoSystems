import { useState, useCallback, useEffect } from 'react';
import { ControlView } from './components/ControlView';
import { StatisticsView } from './components/StatisticsView';
import { WeatherView } from './components/WeatherView';
import { NotificationsView } from './components/NotificationsView';
import { CropProfilesView } from './components/CropProfilesView';
import { DiagnosticsView, SEED_ERRORS } from './components/DiagnosticsView';
import { Sidebar } from './components/Sidebar';
import { BASE_WEATHER, computeRecommendation } from './weather';
import type { ValveEvent, ErrorLog, ErrorSeverity, ErrorCategory } from './types';

type View = 'control' | 'statistics' | 'weather' | 'notifications' | 'crops' | 'diagnostics';

const VALVES_API_URL = 'http://localhost:8001';
const HISTORICOS_API_URL = 'http://localhost:8002';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('control');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [valveEvents, setValveEvents] = useState<ValveEvent[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);

  // Función para obtener eventos de riego desde el Backend
  const fetchValveEvents = useCallback(async () => {
    try {
      const response = await fetch(`${VALVES_API_URL}/api/irrigation/events`);
      if (response.ok) {
        const data = await response.json();
        const mappedEvents: ValveEvent[] = data.map((item: any) => ({
          id: item.id_registro.toString(),
          zoneId: item.id_valvula,
          zoneName: item.nombre_valvula || `Válvula ${item.id_valvula}`,
          action: item.accion === 'ABRIR' ? 'open' : 'close',
          reason: item.motivo.toLowerCase().includes('manual') ? 'manual' : 'auto',
          triggerDetail: item.motivo,
          timestamp: new Date(item.fecha_hora).getTime(),
        }));
        setValveEvents(mappedEvents);
      }
    } catch (error) {
      console.error('Error al obtener eventos de válvulas:', error);
    }
  }, []);

  // Función para obtener logs de error desde el Backend
  const fetchErrorLogs = useCallback(async () => {
    try {
      const response = await fetch(`${HISTORICOS_API_URL}/api/v1/system-errors`, {
        headers: { 'x-user-role': 'Administrador' }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedErrors: ErrorLog[] = data.map((item: any) => {
          let severity: ErrorSeverity = 'warning';
          if (item.tipo_error === 'SISTEMA') severity = 'critical';
          else if (item.tipo_error === 'HARDWARE' || item.tipo_error === 'CODIGO') severity = 'error';

          let category: ErrorCategory = 'backend';
          if (item.tipo_error === 'BASE_DATOS') category = 'database';
          else if (item.tipo_error === 'HARDWARE') category = 'hardware';
          else if (item.tipo_error === 'CONEXION') category = 'connection';

          return {
            id: item.id_error.toString(),
            severity,
            category,
            origin: item.nodo_id || 'Servidor Central',
            originId: item.nodo_id || 'API',
            title: item.mensaje_error,
            detail: item.detalle_tecnico || item.mensaje_error,
            resolved: false, // El backend no persiste resolución, se controla en frontend
            timestamp: new Date(item.fecha_hora).getTime(),
          };
        });
        setErrorLogs(mappedErrors);
      } else {
        // Fallback a los errores semilla si no está autorizado
        setErrorLogs([...SEED_ERRORS].sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.error('Error al obtener logs de error:', error);
      setErrorLogs([...SEED_ERRORS].sort((a, b) => b.timestamp - a.timestamp));
    }
  }, []);

  // Carga inicial y actualización periódica (cada 10 segundos)
  useEffect(() => {
    fetchValveEvents();
    fetchErrorLogs();

    const interval = setInterval(() => {
      fetchValveEvents();
      fetchErrorLogs();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchValveEvents, fetchErrorLogs]);

  const handleValveEvent = useCallback((event: ValveEvent) => {
    setValveEvents(prev => [event, ...prev].slice(0, 200));
  }, []);

  const handleAddError = useCallback((error: ErrorLog) => {
    setErrorLogs(prev => [error, ...prev].slice(0, 500));
  }, []);

  const handleResolveError = useCallback((id: string) => {
    setErrorLogs(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
  }, []);

  const handleDeleteError = useCallback((id: string) => {
    setErrorLogs(prev => prev.filter(e => e.id !== id));
  }, []);

  const weatherRec = computeRecommendation(BASE_WEATHER);
  const activeErrorCount = errorLogs.filter(e => !e.resolved).length;
  const hasCritical = errorLogs.some(e => e.severity === 'critical' && !e.resolved);

  const renderView = () => {
    switch (currentView) {
      case 'control':
        return <ControlView onValveEvent={handleValveEvent} weatherRec={weatherRec} />;
      case 'statistics':
        return <StatisticsView />;
      case 'weather':
        return <WeatherView />;
      case 'notifications':
        return <NotificationsView valveEvents={valveEvents} />;
      case 'crops':
        return <CropProfilesView />;
      case 'diagnostics':
        return (
          <DiagnosticsView
            errorLogs={errorLogs}
            onAddError={handleAddError}
            onResolveError={handleResolveError}
            onDeleteError={handleDeleteError}
          />
        );
      default:
        return <ControlView onValveEvent={handleValveEvent} weatherRec={weatherRec} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        valveEventCount={valveEvents.length}
        activeErrorCount={activeErrorCount}
        hasCritical={hasCritical}
      />
      <div className="md:ml-64">{renderView()}</div>
    </div>
  );
}
