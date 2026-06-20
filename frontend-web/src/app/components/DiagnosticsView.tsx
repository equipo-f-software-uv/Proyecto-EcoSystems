import { useState, useCallback } from 'react';
import {
  ShieldAlert, Wifi, Database, Cpu, Radio,
  CheckCircle2, XCircle, AlertTriangle, Download,
  RefreshCw, Filter, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';
import type { ErrorLog, ErrorSeverity, ErrorCategory } from '../types';

// ─── Seed data: realistic pre-existing errors ────────────────────────────────

function ts(minutesAgo: number) {
  return Date.now() - minutesAgo * 60_000;
}

export const SEED_ERRORS: ErrorLog[] = [
  {
    id: 'ERR-001', severity: 'critical', category: 'connection',
    origin: 'Nodo Sensor', originId: 'NODE-04',
    title: 'Pérdida de conexión prolongada',
    detail: 'Sin respuesta del nodo en los últimos 8 minutos. Último paquete recibido: 2026-06-01T08:12:03Z. Intentos de reconexión: 5/5.',
    resolved: false, timestamp: ts(9),
  },
  {
    id: 'ERR-002', severity: 'error', category: 'database',
    origin: 'Servicio DB', originId: 'DB-PRIMARY',
    title: 'Timeout en consulta de umbrales',
    detail: 'SELECT timeout después de 5000 ms en tabla "crop_profiles". Pool de conexiones al 95% de capacidad. Query: SELECT * FROM crop_profiles WHERE zone_id = 3.',
    resolved: false, timestamp: ts(22),
  },
  {
    id: 'ERR-003', severity: 'warning', category: 'hardware',
    origin: 'Nodo Sensor', originId: 'NODE-02',
    title: 'Paquete de datos corrupto recibido',
    detail: 'CRC mismatch en trama recibida. Payload esperado: 32 bytes, recibido: 29 bytes. El paquete fue descartado y se solicitó reenvío.',
    resolved: true, timestamp: ts(45),
  },
  {
    id: 'ERR-004', severity: 'error', category: 'backend',
    origin: 'Servidor Central', originId: 'API-CORE',
    title: 'Fallo al publicar estado en broker MQTT',
    detail: 'Error EPIPE al intentar escribir en el socket del broker MQTT (mqtt://broker.hivemq.com:1883). Re-intentando conexión en 2000ms.',
    resolved: false, timestamp: ts(60),
  },
  {
    id: 'ERR-005', severity: 'warning', category: 'sensor',
    origin: 'Sensor Humedad', originId: 'SNS-ZONE3',
    title: 'Lectura de humedad fuera de rango',
    detail: 'El sensor reportó 105% de humedad relativa, excediendo el rango físico (0-100%). Se aplicó filtro de mediana móvil y se reportó lectura descartada.',
    resolved: false, timestamp: ts(120),
  }
];

interface DiagnosticsViewProps {
  errorLogs: ErrorLog[];
  onAddError: (error: ErrorLog) => void;
  onResolveError: (id: string) => void;
  onDeleteError: (id: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function DiagnosticsView({
  errorLogs,
  onAddError,
  onResolveError,
  onDeleteError,
}: DiagnosticsViewProps) {
  const [filterSeverity, setFilterSeverity] = useState<'all' | ErrorSeverity>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | ErrorCategory>('all');
  const [expandedErrors, setExpandedErrors] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedErrors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSimulateError = () => {
    const errorTypes: Array<{
      severity: ErrorSeverity;
      category: ErrorCategory;
      title: string;
      detail: string;
      origin: string;
      originId: string;
    }> = [
      {
        severity: 'critical', category: 'connection',
        origin: 'Nodo Sensor', originId: 'NODE-05',
        title: 'Fallo total de comunicación RF',
        detail: 'El transceptor nRF24L01 reporta pérdida de portadora. Se detecta alta interferencia en canal 76. Intentando salto de frecuencia.'
      },
      {
        severity: 'error', category: 'database',
        origin: 'Servicio DB', originId: 'DB-REPLICA',
        title: 'Fallo de réplica de lectura',
        detail: 'Error: pg_read_replica replication lag exceeds 300s. Conexión de réplica detenida por la base de datos primaria.'
      },
      {
        severity: 'warning', category: 'hardware',
        origin: 'Batería Nodo', originId: 'NODE-01',
        title: 'Nivel de batería crítico',
        detail: 'Voltaje detectado: 3.1V (umbral mínimo: 3.3V). El nodo entrará en modo de bajo consumo, reportando lecturas cada 30 minutos.'
      },
      {
        severity: 'error', category: 'backend',
        origin: 'Servidor Central', originId: 'API-SCHEDULER',
        title: 'Tarea programada de riego fallida',
        detail: 'El cron job "irrigation_scheduler" falló al ejecutar la zona 2. Causa: El controlador de válvulas no respondió a la trama de confirmación.'
      },
      {
        severity: 'warning', category: 'sensor',
        origin: 'Sensor pH', originId: 'SNS-PH-01',
        title: 'Desviación de calibración de pH',
        detail: 'La lectura del electrodo de pH está fuera de rango operativo estable (lectura: 3.2, esperado: 5.5-8.0). Requiere mantenimiento físico o calibración con buffer.'
      }
    ];

    const pick = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    const newErr: ErrorLog = {
      id: `ERR-${Math.floor(100 + Math.random() * 900)}`,
      ...pick,
      resolved: false,
      timestamp: Date.now()
    };
    onAddError(newErr);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const exportCSV = () => {
    const header = 'ID Error,Gravedad,Categoría,Origen,ID Origen,Mensaje,Detalle Técnico,Estado,Timestamp';
    const rows = errorLogs.map(ev =>
      [ev.id, ev.severity.toUpperCase(), ev.category.toUpperCase(), `"${ev.origin}"`, ev.originId,
       `"${ev.title}"`, `"${ev.detail.replace(/"/g, '""')}"`, ev.resolved ? 'Resuelto' : 'Activo',
       new Date(ev.timestamp).toISOString()
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `error-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const categoryIcon = (category: ErrorCategory, className = "w-5 h-5") => {
    switch (category) {
      case 'connection': return <Wifi className={className} />;
      case 'database':   return <Database className={className} />;
      case 'hardware':   return <Cpu className={className} />;
      case 'backend':    return <Cpu className={className} />;
      case 'sensor':     return <Radio className={className} />;
      default:           return <ShieldAlert className={className} />;
    }
  };

  const severityConfig = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-l-4 border-l-destructive',
          bg: 'bg-red-50 dark:bg-red-950/10',
          text: 'text-destructive',
          label: 'Crítico'
        };
      case 'error':
        return {
          border: 'border-l-4 border-l-orange-500',
          bg: 'bg-orange-50 dark:bg-orange-950/10',
          text: 'text-orange-600 dark:text-orange-400',
          label: 'Error'
        };
      case 'warning':
        return {
          border: 'border-l-4 border-l-yellow-500',
          bg: 'bg-yellow-50 dark:bg-yellow-950/10',
          text: 'text-yellow-600 dark:text-yellow-400',
          label: 'Advertencia'
        };
    }
  };

  const filtered = errorLogs.filter(ev => {
    if (filterSeverity !== 'all' && ev.severity !== filterSeverity) return false;
    if (filterCategory !== 'all' && ev.category !== filterCategory) return false;
    return true;
  });

  const activeErrors = errorLogs.filter(e => !e.resolved);
  const activeCount = activeErrors.length;
  const criticalCount = activeErrors.filter(e => e.severity === 'critical').length;
  const hasActiveConnectionErr = activeErrors.some(e => e.category === 'connection' || e.category === 'sensor');
  const hasActiveDbErr = activeErrors.some(e => e.category === 'database');
  const hasActiveBackendErr = activeErrors.some(e => e.category === 'backend');

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-75">EcoSystems</p>
            <h1>Diagnósticos del Sistema</h1>
            <p className="text-sm opacity-90">Salud de componentes · Historial de errores</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-sm bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleSimulateError}
              className="flex items-center gap-1.5 text-sm bg-destructive text-destructive-foreground hover:opacity-95 px-3 py-2 rounded-lg transition-colors"
            >
              Simular Fallo
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 max-w-4xl space-y-6">
        {/* Health status metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-muted-foreground mb-1">Red de Sensores</p>
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${hasActiveConnectionErr ? 'bg-amber-500 animate-pulse' : 'bg-plant'}`} />
              <span className="text-sm font-semibold">{hasActiveConnectionErr ? 'Interrupciones' : 'Operacional'}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-muted-foreground mb-1">Base de Datos</p>
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${hasActiveDbErr ? 'bg-destructive animate-pulse' : 'bg-plant'}`} />
              <span className="text-sm font-semibold">{hasActiveDbErr ? ' Timeout/Fallo' : 'Operacional'}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-muted-foreground mb-1">Servidor Central</p>
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${hasActiveBackendErr ? 'bg-destructive animate-pulse' : 'bg-plant'}`} />
              <span className="text-sm font-semibold">{hasActiveBackendErr ? 'Fallo Servicio' : 'Operacional'}</span>
            </div>
          </div>
        </div>

        {/* Global count banner */}
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium">Total: {errorLogs.length} logs</span>
          <span className={`px-2.5 py-1 rounded-full font-medium ${activeCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-plant-light text-plant-dark'}`}>
            Activos: {activeCount}
          </span>
          <span className={`px-2.5 py-1 rounded-full font-medium ${criticalCount > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-muted text-muted-foreground'}`}>
            Críticos: {criticalCount}
          </span>
          <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
            Resueltos: {errorLogs.filter(e => e.resolved).length}
          </span>
        </div>

        {/* Filters and action bar */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Severidad:</span>
              <select
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value as any)}
                className="bg-background text-foreground border border-border rounded-md text-xs px-2 py-1 outline-none"
              >
                <option value="all">Todas</option>
                <option value="critical">Crítico</option>
                <option value="error">Error</option>
                <option value="warning">Advertencia</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Categoría:</span>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value as any)}
                className="bg-background text-foreground border border-border rounded-md text-xs px-2 py-1 outline-none"
              >
                <option value="all">Todas</option>
                <option value="connection">Conexión</option>
                <option value="database">Base de Datos</option>
                <option value="hardware">Hardware</option>
                <option value="backend">Backend</option>
                <option value="sensor">Sensor</option>
              </select>
            </div>
          </div>
          {errorLogs.length > 0 && (
            <button
              onClick={exportCSV}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors shrink-0"
              title="Exportar registros a CSV"
            >
              <Download className="w-4 h-4" />
              <span>Exportar logs</span>
            </button>
          )}
        </div>

        {/* Error list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-plant" />
            <p className="text-muted-foreground">
              {errorLogs.length === 0
                ? 'El registro de diagnósticos está vacío.'
                : 'No se encontraron errores con los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(err => {
              const cfg = severityConfig(err.severity);
              const isExpanded = !!expandedErrors[err.id];

              return (
                <div
                  key={err.id}
                  className={`bg-card border rounded-xl overflow-hidden transition-all ${cfg.border} border-border`}
                >
                  <div
                    onClick={() => toggleExpand(err.id)}
                    className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg} ${cfg.text}`}>
                        {categoryIcon(err.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-foreground truncate">{err.title}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${err.resolved ? 'bg-plant-light text-plant-dark' : 'bg-destructive/10 text-destructive'}`}>
                            {err.resolved ? 'Resuelto' : 'Activo'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Origen: <span className="font-medium text-foreground">{err.origin}</span> ({err.originId})
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatTime(err.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                        #{err.id}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border bg-muted/20">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Detalle Técnico:</p>
                          <pre className="text-xs bg-background text-foreground border border-border rounded-lg p-3 overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                            {err.detail}
                          </pre>
                        </div>
                        <div className="flex justify-end gap-2 text-xs pt-1">
                          {!err.resolved && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onResolveError(err.id); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Marcar como Resuelto</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteError(err.id); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded border border-destructive text-destructive hover:bg-destructive/5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar Log</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
