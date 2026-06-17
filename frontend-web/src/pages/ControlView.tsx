import { useState } from 'react';
import { IrrigationZoneCard } from '../components/IrrigationZoneCard';
import { AddZoneModal } from '../components/AddZoneModal';
import { AlertTriangle, Droplets, Play, Plus } from 'lucide-react';

interface Zone {
  id: number;
  name: string;
  isActive: boolean;
  flowRate: number;
  duration: number;
}

export function ControlView() {
  const [zones, setZones] = useState<Zone[]>([
    { id: 1, name: 'Zona Norte', isActive: false, flowRate: 45, duration: 30 },
    { id: 2, name: 'Zona Sur', isActive: false, flowRate: 38, duration: 25 },
    { id: 3, name: 'Zona Este', isActive: false, flowRate: 52, duration: 35 },
    { id: 4, name: 'Zona Oeste', isActive: false, flowRate: 41, duration: 28 },
    { id: 5, name: 'Invernadero 1', isActive: false, flowRate: 28, duration: 20 },
    { id: 6, name: 'Invernadero 2', isActive: false, flowRate: 30, duration: 20 },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [nextId, setNextId] = useState(7);

  const handleToggleZone = (id: number) => {
    setZones(zones.map(zone =>
      zone.id === id ? { ...zone, isActive: !zone.isActive } : zone
    ));
  };

  const handleUpdateName = (id: number, name: string) => {
    setZones(zones.map(zone =>
      zone.id === id ? { ...zone, name } : zone
    ));
  };

  const handleUpdateDuration = (id: number, duration: number) => {
    setZones(zones.map(zone =>
      zone.id === id ? { ...zone, duration } : zone
    ));
  };

  const handleUpdateFlowRate = (id: number, flowRate: number) => {
    setZones(zones.map(zone =>
      zone.id === id ? { ...zone, flowRate } : zone
    ));
  };

  const handleEmergencyStop = () => {
    setZones(zones.map(zone => ({ ...zone, isActive: false })));
  };

  const handleActivateAll = () => {
    setZones(zones.map(zone => ({ ...zone, isActive: true })));
  };

  const handleAddZone = (name: string, flowRate: number, duration: number) => {
    const newZone: Zone = {
      id: nextId,
      name,
      flowRate,
      duration,
      isActive: false
    };
    setZones([...zones, newZone]);
    setNextId(nextId + 1);
  };

  const handleDeleteZone = (id: number) => {
    setZones(zones.filter(zone => zone.id !== id));
  };

  const activeZones = zones.filter(z => z.isActive).length;

  return (
    <div className="pb-6">
      <div className="bg-primary text-primary-foreground px-4 py-6 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <Droplets className="w-8 h-8" />
          <div>
            <p className="text-sm opacity-75">EcoSystems</p>
            <h1>Control de Riego</h1>
          </div>
        </div>
        <p className="text-sm opacity-90">
          {activeZones > 0
            ? `${activeZones} zona${activeZones > 1 ? 's' : ''} en operación`
            : 'Todas las zonas inactivas'}
        </p>
      </div>

      <div className="px-4 mt-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleActivateAll}
            disabled={zones.length === 0 || activeZones === zones.length}
            className={`py-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
              zones.length > 0 && activeZones < zones.length
                ? 'bg-secondary text-secondary-foreground hover:opacity-90 shadow-lg'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5" />
            <span>Activar Todo</span>
          </button>

          <button
            onClick={handleEmergencyStop}
            disabled={activeZones === 0}
            className={`py-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeZones > 0
                ? 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-lg'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Detener Todo</span>
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-muted-foreground">Zonas de Riego ({zones.length})</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Zona</span>
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <Droplets className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No hay zonas de riego configuradas</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              Agregar Primera Zona
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {zones.map(zone => (
              <IrrigationZoneCard
                key={zone.id}
                {...zone}
                onToggle={handleToggleZone}
                onUpdateName={handleUpdateName}
                onUpdateDuration={handleUpdateDuration}
                onUpdateFlowRate={handleUpdateFlowRate}
                onDelete={handleDeleteZone}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddZoneModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddZone}
        />
      )}
    </div>
  );
}