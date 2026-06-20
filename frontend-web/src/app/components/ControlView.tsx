import { useState, useEffect, useRef, useCallback } from 'react';
import { IrrigationZoneCard } from './IrrigationZoneCard';
import { AddZoneModal } from './AddZoneModal';
import { AlertTriangle, Droplets, Play, Plus, Cpu, TrendingDown, TrendingUp, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import type { ValveEvent } from '../types';
import type { IrrigationRecommendation } from '../weather';

export interface Zone {
  id: number;
  name: string;
  isActive: boolean;
  flowRate: number;
  duration: number;
  autoMode: boolean;
  currentHumidity: number;
  minHumidity: number;
  maxHumidity: number;
  nodeId: string;
}

interface ControlViewProps {
  onValveEvent: (event: ValveEvent) => void;
  weatherRec?: IrrigationRecommendation;
}

const REC_STYLES = {
  skip:     { wrap: 'bg-blue-50 border-blue-300',    icon: <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />,    text: 'text-blue-800' },
  reduce:   { wrap: 'bg-amber-50 border-amber-300',  icon: <TrendingDown className="w-5 h-5 text-amber-600 shrink-0" />,  text: 'text-amber-800' },
  normal:   { wrap: 'bg-green-50 border-green-300',  icon: <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />,  text: 'text-green-800' },
  increase: { wrap: 'bg-orange-50 border-orange-300',icon: <TrendingUp className="w-5 h-5 text-orange-600 shrink-0" />,   text: 'text-orange-800' },
};

function seedHumidity(id: number) { return 45 + ((id * 17) % 30); }

const INITIAL_ZONES: Zone[] = [
  { id: 1, name: 'Zona Norte',    isActive: false, flowRate: 45, duration: 30, autoMode: true, currentHumidity: seedHumidity(1), minHumidity: 30, maxHumidity: 80, nodeId: 'nodo_huerto_01' },
  { id: 2, name: 'Zona Sur',      isActive: false, flowRate: 38, duration: 25, autoMode: true, currentHumidity: seedHumidity(2), minHumidity: 40, maxHumidity: 70, nodeId: 'NODO_VALPO_01' },
  { id: 3, name: 'Zona Este',     isActive: false, flowRate: 52, duration: 35, autoMode: true, currentHumidity: seedHumidity(3), minHumidity: 40, maxHumidity: 70, nodeId: 'nodo_huerto_03' },
  { id: 4, name: 'Zona Oeste',    isActive: false, flowRate: 41, duration: 28, autoMode: true, currentHumidity: seedHumidity(4), minHumidity: 40, maxHumidity: 70, nodeId: 'nodo_huerto_04' },
  { id: 5, name: 'Invernadero 1', isActive: false, flowRate: 28, duration: 20, autoMode: true, currentHumidity: seedHumidity(5), minHumidity: 50, maxHumidity: 75, nodeId: 'nodo_huerto_05' },
  { id: 6, name: 'Invernadero 2', isActive: false, flowRate: 30, duration: 20, autoMode: true, currentHumidity: seedHumidity(6), minHumidity: 50, maxHumidity: 75, nodeId: 'nodo_huerto_06' },
];

const VALVES_API_URL = 'http://localhost:8001';
const HISTORICOS_API_URL = 'http://localhost:8002';
const PERFILES_API_URL = 'http://localhost:8003';

function makeEvent(zone: { id: number; name: string }, action: 'open' | 'close', reason: 'auto' | 'manual', triggerDetail: string): ValveEvent {
  return {
    id: `${zone.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    zoneId: zone.id, zoneName: zone.name, action, reason, triggerDetail, timestamp: Date.now(),
  };
}

export function ControlView({ onValveEvent, weatherRec }: ControlViewProps) {
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [nextId, setNextId] = useState(7);
  const [autoLog, setAutoLog] = useState<ValveEvent[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  const emit = useCallback((ev: ValveEvent) => {
    onValveEvent(ev);
    if (ev.reason === 'auto') setAutoLog(prev => [ev, ...prev].slice(0, 20));
  }, [onValveEvent]);

  // Efecto para sincronizar el estado del backend en tiempo real
  const syncWithBackend = useCallback(async () => {
    try {
      const updatedZones = await Promise.all(
        zones.map(async (zone) => {
          let updatedZone = { ...zone };

          // 1. Obtener estado de la válvula
          try {
            const valveRes = await fetch(`${VALVES_API_URL}/api/v1/valves/${zone.id}/status`);
            if (valveRes.ok) {
              const valveData = await valveRes.json();
              updatedZone.isActive = valveData.status === 'OPEN';
              updatedZone.autoMode = valveData.mode === 'AUTOMATIC';
            }
          } catch (e) {
            // Ignorar fallos de comunicación individuales
          }

          // 2. Obtener humedad más reciente del sensor
          try {
            const humidityRes = await fetch(`${HISTORICOS_API_URL}/api/sensores/${zone.nodeId}/historico?dias=1`);
            if (humidityRes.ok) {
              const readings = await humidityRes.json();
              if (readings && readings.length > 0) {
                const latest = readings[readings.length - 1];
                updatedZone.currentHumidity = parseFloat(latest.humedad_suelo_prc);
              }
            }
          } catch (e) {
            // Ignorar fallos de comunicación individuales
          }

          return updatedZone;
        })
      );

      setZones(updatedZones);
    } catch (err) {
      console.error('Error sincronizando con Backend:', err);
    }
  }, [zones]);

  // Consulta al backend cada 5 segundos
  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 5000);
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  // Simulación local de deriva de humedad como fallback o para animar lecturas
  useEffect(() => {
    const interval = setInterval(() => {
      setZones(prev => prev.map(zone => {
        const drift = zone.isActive ? +(Math.random() * 1.5).toFixed(1) : -(Math.random() * 0.8).toFixed(1);
        const next = Math.min(100, Math.max(0, +(zone.currentHumidity + drift).toFixed(1)));
        
        // Si está en autoMode pero el backend no responde, hacemos la simulación lógica local
        if (zone.autoMode) {
          let newActive = zone.isActive;
          if (!zone.isActive && next < zone.minHumidity) {
            newActive = true;
            emit(makeEvent(zone, 'open', 'auto', `Umbral mínimo ${zone.minHumidity}% — humedad ${next}%`));
          } else if (zone.isActive && next >= zone.maxHumidity) {
            newActive = false;
            emit(makeEvent(zone, 'close', 'auto', `Umbral máximo ${zone.maxHumidity}% — humedad ${next}%`));
          }
          return { ...zone, currentHumidity: next, isActive: newActive };
        }
        
        return { ...zone, currentHumidity: next };
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, [emit]);

  // Accionar una válvula individual (Abrir / Cerrar)
  const handleToggleZone = async (id: number) => {
    const zone = zones.find(z => z.id === id);
    if (!zone) return;

    const nextAction = zone.isActive ? 'CERRAR' : 'ABRIR';
    
    try {
      const response = await fetch(`${VALVES_API_URL}/api/v1/valves/${id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextAction, operatorId: 'web_operator' })
      });

      if (response.ok) {
        const data = await response.json();
        setZones(prev => prev.map(z => z.id === id ? { ...z, isActive: data.accion === 'ABRIR', autoMode: false } : z));
        emit(makeEvent(zone, data.accion === 'ABRIR' ? 'open' : 'close', 'manual', 'Override manual vía Web'));
      }
    } catch (e) {
      console.error('Error al accionar válvula en backend:', e);
      // Fallback local
      const nextActive = !zone.isActive;
      setZones(prev => prev.map(z => z.id === id ? { ...z, isActive: nextActive } : z));
      emit(makeEvent(zone, nextActive ? 'open' : 'close', 'manual', 'Acción local (Sin conexión)'));
    }
  };

  // Activar todas las zonas
  const handleActivateAll = async () => {
    for (const zone of zones) {
      if (!zone.isActive) {
        try {
          await fetch(`${VALVES_API_URL}/api/v1/valves/${zone.id}/override`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ABRIR', operatorId: 'web_operator' })
          });
          emit(makeEvent(zone, 'open', 'manual', 'Activar Todo — acción de usuario'));
        } catch (e) {
          console.error(`Error activando zona ${zone.id}:`, e);
        }
      }
    }
    setZones(prev => prev.map(z => ({ ...z, isActive: true, autoMode: false })));
  };

  // Parada de Emergencia Global
  const handleEmergencyStop = async () => {
    try {
      const response = await fetch(`${VALVES_API_URL}/api/v1/system/emergency-stop/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Parada de Emergencia desde panel web', operatorId: 'web_operator' })
      });

      if (response.ok) {
        setIsEmergencyActive(true);
        setZones(prev => prev.map(z => {
          if (z.isActive) emit(makeEvent(z, 'close', 'manual', 'Detener Todo (EMERGENCIA GLOBAL)'));
          return { ...z, isActive: false };
        }));
      }
    } catch (e) {
      console.error('Error al activar parada de emergencia:', e);
      setZones(prev => prev.map(z => {
        if (z.isActive) emit(makeEvent(z, 'close', 'manual', 'Detener Todo (Acción local)'));
        return { ...z, isActive: false };
      }));
    }
  };

  // Desactivar parada de emergencia
  const handleDeactivateEmergency = async () => {
    try {
      const response = await fetch(`${VALVES_API_URL}/api/v1/system/emergency-stop/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: 'web_operator' })
      });
      if (response.ok) {
        setIsEmergencyActive(false);
      }
    } catch (e) {
      console.error('Error desactivando parada de emergencia:', e);
      setIsEmergencyActive(false);
    }
  };

  // Alternar entre Automático y Manual
  const handleToggleAutoMode = async (id: number) => {
    const zone = zones.find(z => z.id === id);
    if (!zone) return;

    try {
      let response;
      if (zone.autoMode) {
        // Pasar a manual (override cerrado)
        response = await fetch(`${VALVES_API_URL}/api/v1/valves/${id}/override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CERRAR', operatorId: 'web_operator' })
        });
      } else {
        // Restaurar modo automático
        response = await fetch(`${VALVES_API_URL}/api/v1/valves/${id}/auto`, {
          method: 'POST',
        });
      }

      if (response.ok) {
        setZones(prev => prev.map(z => z.id === id ? { ...z, autoMode: !z.autoMode, isActive: zone.autoMode ? false : z.isActive } : z));
      }
    } catch (e) {
      console.error('Error cambiando modo auto/manual:', e);
      setZones(prev => prev.map(z => z.id === id ? { ...z, autoMode: !z.autoMode } : z));
    }
  };

  // Actualizar umbrales en el Backend
  const handleUpdateThresholds = async (id: number, min: number, max: number) => {
    try {
      const response = await fetch(`${PERFILES_API_URL}/api/irrigation/thresholds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_perfil: id, humedad_min_prc: min, humedad_max_prc: max })
      });

      if (response.ok) {
        setZones(prev => prev.map(z => z.id === id ? { ...z, minHumidity: min, maxHumidity: max } : z));
      }
    } catch (e) {
      console.error('Error actualizando umbrales:', e);
      setZones(prev => prev.map(z => z.id === id ? { ...z, minHumidity: min, maxHumidity: max } : z));
    }
  };

  const handleUpdateName        = (id: number, name: string)     => setZones(p => p.map(z => z.id === id ? { ...z, name }     : z));
  const handleUpdateDuration    = (id: number, duration: number) => setZones(p => p.map(z => z.id === id ? { ...z, duration } : z));
  const handleUpdateFlowRate    = (id: number, flowRate: number) => setZones(p => p.map(z => z.id === id ? { ...z, flowRate } : z));
  const handleDeleteZone        = (id: number)                   => setZones(p => p.filter(z => z.id !== id));
  
  const handleAddZone = (name: string, flowRate: number, duration: number) => {
    const id = nextId;
    const nodeId = `nodo_huerto_0${id}`;
    setZones(prev => [...prev, { id, name, flowRate, duration, isActive: false, autoMode: true, currentHumidity: seedHumidity(id), minHumidity: 40, maxHumidity: 70, nodeId }]);
    setNextId(id + 1);
  };

  const activeZones = zones.filter(z => z.isActive).length;
  const autoZones   = zones.filter(z => z.autoMode).length;

  return (
    <div className="pb-6">
      <div className="bg-primary text-primary-foreground px-4 py-6 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="w-8 h-8 animate-pulse text-accent" />
            <div>
              <p className="text-sm opacity-75">EcoSystems</p>
              <h1>Control de Riego</h1>
            </div>
          </div>
          {isEmergencyActive && (
            <button onClick={handleDeactivateEmergency} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs hover:opacity-90 animate-bounce">
              Reactivar Sistema
            </button>
          )}
        </div>
        <div className="flex gap-4 text-sm opacity-90 mt-2 flex-wrap">
          <span>{activeZones > 0 ? `${activeZones} zona${activeZones > 1 ? 's' : ''} en operación` : 'Todas las zonas inactivas'}</span>
          {autoZones > 0 && <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" />{autoZones} en modo automático</span>}
        </div>
      </div>

      <div className="px-4 mt-6">
        {/* Weather recommendation banner */}
        {weatherRec && weatherRec.level !== 'normal' && (
          <div className={`mb-5 flex items-start gap-3 p-3 rounded-xl border ${REC_STYLES[weatherRec.level].wrap}`}>
            {REC_STYLES[weatherRec.level].icon}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${REC_STYLES[weatherRec.level].text}`}>{weatherRec.title}</p>
              <p className="text-xs text-foreground/70 mt-0.5 line-clamp-2">{weatherRec.message}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={handleActivateAll} disabled={zones.length === 0 || activeZones === zones.length || isEmergencyActive}
            className={`py-4 rounded-lg flex items-center justify-center gap-2 transition-all ${zones.length > 0 && activeZones < zones.length && !isEmergencyActive ? 'bg-secondary text-secondary-foreground hover:opacity-90 shadow-lg' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
            <Play className="w-5 h-5" /><span>Activar Todo</span>
          </button>
          <button onClick={handleEmergencyStop} disabled={activeZones === 0 && !isEmergencyActive}
            className={`py-4 rounded-lg flex items-center justify-center gap-2 transition-all ${activeZones > 0 || isEmergencyActive ? 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-lg' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
            <AlertTriangle className="w-5 h-5 animate-bounce" /><span>{isEmergencyActive ? 'Parada Activa' : 'Detener Todo'}</span>
          </button>
        </div>

        {autoLog.length > 0 && (
          <div className="mb-6 bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/40">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Actuaciones automáticas recientes</span>
            </div>
            <div className="divide-y divide-border max-h-40 overflow-y-auto">
              {autoLog.map((ev, i) => (
                <div key={`${ev.id}-${i}`} className="px-4 py-2 flex items-center gap-3 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${ev.action === 'open' ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <span className="text-foreground flex-1"><strong>{ev.zoneName}</strong> — válvula {ev.action === 'open' ? 'abierta' : 'cerrada'} · {ev.triggerDetail}</span>
                  <span className="text-muted-foreground shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-muted-foreground">Zonas de Riego ({zones.length})</h2>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow">
            <Plus className="w-4 h-4" /><span>Agregar Zona</span>
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Droplets className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No hay zonas de riego configuradas</p>
            <button onClick={() => setShowAddModal(true)} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">Agregar Primera Zona</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {zones.map(zone => (
              <IrrigationZoneCard key={zone.id} {...zone}
                onToggle={handleToggleZone} onUpdateName={handleUpdateName}
                onUpdateDuration={handleUpdateDuration} onUpdateFlowRate={handleUpdateFlowRate}
                onDelete={handleDeleteZone} onToggleAutoMode={handleToggleAutoMode}
                onUpdateThresholds={handleUpdateThresholds}
              />
            ))}
          </div>
        )}
      </div>
      {showAddModal && <AddZoneModal onClose={() => setShowAddModal(false)} onAdd={handleAddZone} />}
    </div>
  );
}