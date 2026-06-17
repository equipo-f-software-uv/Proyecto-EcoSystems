import { Droplets, Clock, Pencil, Check, X, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface IrrigationZoneCardProps {
  id: number;
  name: string;
  isActive: boolean;
  flowRate: number;
  duration: number;
  onToggle: (id: number) => void;
  onUpdateName: (id: number, name: string) => void;
  onUpdateDuration: (id: number, duration: number) => void;
  onUpdateFlowRate: (id: number, flowRate: number) => void;
  onDelete: (id: number) => void;
}

export function IrrigationZoneCard({
  id,
  name,
  isActive,
  flowRate,
  duration,
  onToggle,
  onUpdateName,
  onUpdateDuration,
  onUpdateFlowRate,
  onDelete
}: IrrigationZoneCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [isEditingFlowRate, setIsEditingFlowRate] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [editedDuration, setEditedDuration] = useState(duration.toString());
  const [editedFlowRate, setEditedFlowRate] = useState(flowRate.toString());

  const handleSaveName = () => {
    if (editedName.trim()) {
      onUpdateName(id, editedName.trim());
      setIsEditingName(false);
    }
  };

  const handleCancelName = () => {
    setEditedName(name);
    setIsEditingName(false);
  };

  const handleSaveDuration = () => {
    const newDuration = parseInt(editedDuration);
    if (!isNaN(newDuration) && newDuration > 0) {
      onUpdateDuration(id, newDuration);
      setIsEditingDuration(false);
    }
  };

  const handleCancelDuration = () => {
    setEditedDuration(duration.toString());
    setIsEditingDuration(false);
  };

  const handleSaveFlowRate = () => {
    const newFlowRate = parseInt(editedFlowRate);
    if (!isNaN(newFlowRate) && newFlowRate > 0) {
      onUpdateFlowRate(id, newFlowRate);
      setIsEditingFlowRate(false);
    }
  };

  const handleCancelFlowRate = () => {
    setEditedFlowRate(flowRate.toString());
    setIsEditingFlowRate(false);
  };

  return (
    <div className={`rounded-lg border p-4 transition-all ${
      isActive
        ? 'bg-water-light border-water'
        : 'bg-card border-border'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <Droplets className={`w-5 h-5 ${isActive ? 'text-water' : 'text-muted-foreground'}`} />
          {isEditingName ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="flex-1 px-2 py-1 rounded border border-border bg-background text-foreground"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelName();
                }}
              />
              <button
                onClick={handleSaveName}
                className="p-1 text-plant-dark hover:bg-plant-light rounded"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelName}
                className="p-1 text-destructive hover:bg-destructive/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-foreground">{name}</h3>
              <button
                onClick={() => setIsEditingName(true)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                disabled={isActive}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${
          isActive
            ? 'bg-water text-white'
            : 'bg-muted text-muted-foreground'
        }`}>
          {isActive ? 'Activo' : 'Inactivo'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-background rounded p-2">
          <p className="text-xs text-muted-foreground mb-1">Caudal</p>
          {isEditingFlowRate ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editedFlowRate}
                onChange={(e) => setEditedFlowRate(e.target.value)}
                className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground"
                autoFocus
                min="1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFlowRate();
                  if (e.key === 'Escape') handleCancelFlowRate();
                }}
              />
              <span className="text-foreground text-xs">L/min</span>
              <button
                onClick={handleSaveFlowRate}
                className="p-1 text-plant-dark hover:bg-plant-light rounded"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancelFlowRate}
                className="p-1 text-destructive hover:bg-destructive/10 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-foreground">{flowRate} L/min</p>
              <button
                onClick={() => setIsEditingFlowRate(true)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                disabled={isActive}
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className="bg-background rounded p-2">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Duración</p>
          </div>
          {isEditingDuration ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editedDuration}
                onChange={(e) => setEditedDuration(e.target.value)}
                className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground"
                autoFocus
                min="1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDuration();
                  if (e.key === 'Escape') handleCancelDuration();
                }}
              />
              <span className="text-foreground">min</span>
              <button
                onClick={handleSaveDuration}
                className="p-1 text-plant-dark hover:bg-plant-light rounded"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancelDuration}
                className="p-1 text-destructive hover:bg-destructive/10 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-foreground">{duration} min</p>
              <button
                onClick={() => setIsEditingDuration(true)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                disabled={isActive}
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onToggle(id)}
          className={`flex-1 py-3 rounded-lg transition-all ${
            isActive
              ? 'bg-destructive text-destructive-foreground hover:opacity-90'
              : 'bg-primary text-primary-foreground hover:opacity-90'
          }`}
        >
          {isActive ? 'Detener Riego' : 'Iniciar Riego'}
        </button>
        <button
          onClick={() => onDelete(id)}
          disabled={isActive}
          className={`p-3 rounded-lg transition-all ${
            isActive
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground'
          }`}
          title="Eliminar zona"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}