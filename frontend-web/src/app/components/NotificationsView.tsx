import { useState } from 'react';
import { Bell, CloudRain, Droplets, AlertTriangle, CheckCircle, Info, ClipboardList, User, Cpu, Download } from 'lucide-react';
import type { ValveEvent } from '../types';

interface Notification {
  id: number;
  type: 'warning' | 'success' | 'info' | 'alert';
  title: string;
  message: string;
  time: string;
  icon: 'rain' | 'water' | 'check' | 'alert' | 'info';
}

const notifications: Notification[] = [
  { id: 1, type: 'info',    title: 'Lluvia esperada mañana',       message: 'Se pronostica lluvia para mañana con 75% de probabilidad. No será necesario regar las zonas exteriores.', time: 'Hace 30 min', icon: 'rain' },
  { id: 2, type: 'success', title: 'No es necesario regar hoy',    message: 'Las condiciones climáticas actuales son óptimas. La humedad del suelo está en 68%, dentro del rango ideal.', time: 'Hace 2 horas', icon: 'check' },
  { id: 3, type: 'warning', title: 'Programar riego para el viernes', message: 'Se espera clima seco durante el jueves y viernes. Recomendamos programar riego para el viernes en la mañana.', time: 'Hace 3 horas', icon: 'water' },
  { id: 4, type: 'alert',   title: 'Alerta de sequía',              message: 'No se ha detectado lluvia en los últimos 7 días. Considere aumentar la frecuencia de riego en un 15%.', time: 'Ayer', icon: 'alert' },
  { id: 5, type: 'info',    title: 'Análisis semanal',              message: 'Esta semana se consumieron 3,190 litros de agua, un 12% menos que la semana anterior. Excelente eficiencia.', time: 'Hace 2 días', icon: 'info' },
];

interface NotificationsViewProps {
  valveEvents: ValveEvent[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function exportCSV(events: ValveEvent[]) {
  const header = 'ID Registro,ID Válvula,Zona,Acción,Motivo,Detalle,Timestamp';
  const rows = events.map(ev =>
    [ev.id, ev.zoneId, `"${ev.zoneName}"`, ev.action === 'open' ? 'Abrir' : 'Cerrar',
     ev.reason === 'auto' ? 'Automático - Umbral de humedad' : 'Manual - Acción de usuario',
     `"${ev.triggerDetail}"`, new Date(ev.timestamp).toISOString()
    ].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `valve-events-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function NotificationsView({ valveEvents }: NotificationsViewProps) {
  const [tab, setTab] = useState<'alerts' | 'valve-log'>('alerts');
  const [filterReason, setFilterReason] = useState<'all' | 'auto' | 'manual'>('all');
  const [filterAction, setFilterAction] = useState<'all' | 'open' | 'close'>('all');

  const getIcon = (icon: string) => {
    const cls = "w-5 h-5";
    switch (icon) {
      case 'rain':  return <CloudRain className={cls} />;
      case 'water': return <Droplets className={cls} />;
      case 'check': return <CheckCircle className={cls} />;
      case 'alert': return <AlertTriangle className={cls} />;
      default:      return <Info className={cls} />;
    }
  };

  const cardStyle = (type: string) => {
    switch (type) {
      case 'warning': return 'border-l-4 border-l-yellow-500 bg-yellow-50';
      case 'success': return 'border-l-4 border-l-plant bg-plant-light';
      case 'alert':   return 'border-l-4 border-l-destructive bg-red-50';
      default:        return 'border-l-4 border-l-water bg-water-light';
    }
  };

  const iconColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-yellow-600';
      case 'success': return 'text-plant-dark';
      case 'alert':   return 'text-destructive';
      default:        return 'text-water';
    }
  };

  const filtered = valveEvents.filter(ev => {
    if (filterReason !== 'all' && ev.reason !== filterReason) return false;
    if (filterAction !== 'all' && ev.action !== filterAction) return false;
    return true;
  });

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-75">EcoSystems</p>
            <h1>Notificaciones</h1>
            <p className="text-sm opacity-90">Alertas · Registro de válvulas</p>
          </div>
          {notifications.length > 0 && (
            <div className="bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center">
              {notifications.length}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card sticky top-0 z-10">
        <button
          onClick={() => setTab('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
            tab === 'alerts'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="w-4 h-4" />Alertas
        </button>
        <button
          onClick={() => setTab('valve-log')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
            tab === 'valve-log'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Registro de Válvulas
          {valveEvents.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {valveEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* ── ALERTS TAB ── */}
      {tab === 'alerts' && (
        <div className="px-4 mt-6">
          <div className="bg-card rounded-lg border border-border p-4 mb-6">
            <h3 className="text-foreground mb-2">🌦️ Recomendación de hoy</h3>
            <p className="text-sm text-muted-foreground mb-3">Basado en las condiciones climáticas actuales y el pronóstico:</p>
            <div className="bg-plant-light border border-plant rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-plant-dark shrink-0 mt-1" />
                <div>
                  <p className="text-plant-dark mb-1">No regar hoy – Lunes 1 de Junio</p>
                  <p className="text-sm text-foreground">La humedad ambiental está en 65% y se espera llovizna por la tarde. Las plantas tienen suficiente agua. Próximo riego recomendado: Miércoles.</p>
                </div>
              </div>
            </div>
          </div>

          <h2 className="mb-4 text-muted-foreground">Todas las notificaciones</h2>
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id} className={`rounded-lg border border-border p-4 ${cardStyle(n.type)}`}>
                <div className="flex items-start gap-3">
                  <div className={`${iconColor(n.type)} shrink-0 mt-1`}>{getIcon(n.icon)}</div>
                  <div className="flex-1">
                    <h3 className="text-foreground mb-1">{n.title}</h3>
                    <p className="text-sm text-foreground/80 mb-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground">{n.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VALVE LOG TAB ── */}
      {tab === 'valve-log' && (
        <div className="px-4 mt-6">
          {/* Filter + export bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              {(['all', 'auto', 'manual'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setFilterReason(r)}
                  className={`px-3 py-1.5 transition-colors ${filterReason === r ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                >
                  {r === 'all' ? 'Todo' : r === 'auto' ? 'Automático' : 'Manual'}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              {(['all', 'open', 'close'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => setFilterAction(a)}
                  className={`px-3 py-1.5 transition-colors ${filterAction === a ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
                >
                  {a === 'all' ? 'Todas' : a === 'open' ? 'Apertura' : 'Cierre'}
                </button>
              ))}
            </div>
            {valveEvents.length > 0 && (
              <button
                onClick={() => exportCSV(valveEvents)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                title="Exportar CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                {valveEvents.length === 0
                  ? 'Aún no hay eventos registrados. Activa o desactiva una válvula para comenzar.'
                  : 'No hay eventos que coincidan con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Summary chips */}
              <div className="flex gap-2 text-xs mb-4 flex-wrap">
                <span className="bg-muted px-2 py-1 rounded-full text-muted-foreground">{filtered.length} evento{filtered.length !== 1 ? 's' : ''}</span>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">{filtered.filter(e => e.action === 'open').length} aperturas</span>
                <span className="bg-muted-foreground/10 text-muted-foreground px-2 py-1 rounded-full">{filtered.filter(e => e.action === 'close').length} cierres</span>
                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{filtered.filter(e => e.reason === 'manual').length} manuales</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{filtered.filter(e => e.reason === 'auto').length} automáticos</span>
              </div>

              {filtered.map((ev, i) => (
                <div
                  key={`${ev.id}-${i}`}
                  className={`bg-card border rounded-lg p-3 flex items-start gap-3 ${
                    ev.action === 'open' ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-muted-foreground'
                  } border-border`}
                >
                  {/* Action icon */}
                  <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    ev.action === 'open' ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Droplets className={`w-4 h-4 ${ev.action === 'open' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm text-foreground font-medium">{ev.zoneName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ev.action === 'open'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {ev.action === 'open' ? 'Apertura' : 'Cierre'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        ev.reason === 'auto'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ev.reason === 'auto'
                          ? <><Cpu className="w-3 h-3" />Automático - Umbral de humedad</>
                          : <><User className="w-3 h-3" />Manual - Acción de usuario</>
                        }
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ev.triggerDetail}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTime(ev.timestamp)}</p>
                  </div>

                  {/* Zone ID badge */}
                  <span className="text-xs text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                    #{ev.zoneId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}