import { Droplets, Clock, Pencil, Check, X, Trash2, Cpu, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface IrrigationZoneCardProps {
  id: number;
  name: string;
  isActive: boolean;
  flowRate: number;
  duration: number;
  autoMode: boolean;
  currentHumidity: number;
  minHumidity: number;
  maxHumidity: number;
  onToggle: (id: number) => void;
  onUpdateName: (id: number, name: string) => void;
  onUpdateDuration: (id: number, duration: number) => void;
  onUpdateFlowRate: (id: number, flowRate: number) => void;
  onDelete: (id: number) => void;
  onToggleAutoMode: (id: number) => void;
  onUpdateThresholds: (id: number, min: number, max: number) => void;
}

interface ThresholdErrors {
  min?: string;
  max?: string;
  range?: string;
}

function validateThresholds(minStr: string, maxStr: string): ThresholdErrors {
  const errors: ThresholdErrors = {};
  const min = parseFloat(minStr);
  const max = parseFloat(maxStr);
  if (minStr === '' || isNaN(min)) errors.min = 'Requerido';
  else if (min < 0) errors.min = 'Mínimo 0%';
  else if (min > 100) errors.min = 'Máximo 100%';
  if (maxStr === '' || isNaN(max)) errors.max = 'Requerido';
  else if (max < 0) errors.max = 'Mínimo 0%';
  else if (max > 100) errors.max = 'Máximo 100%';
  if (!errors.min && !errors.max && min >= max)
    errors.range = 'El mínimo debe ser menor que el máximo.';
  return errors;
}

function HumidityGauge({ value, min, max }: { value: number; min: number; max: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const tooLow = value < min;
  const inRange = value >= min && value <= max;
  const color = tooLow ? 'bg-destructive' : inRange ? 'bg-primary' : 'bg-amber-500';
  return (
    <div className="w-full">
      <div className="relative h-2 rounded-full bg-muted overflow-visible">
        <div className="absolute h-full rounded-full bg-primary/20" style={{ left: `${min}%`, width: `${max - min}%` }} />
        <div className={`absolute h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-[-3px] w-0.5 h-3.5 bg-primary/60 rounded-full" style={{ left: `${min}%` }} />
        <div className="absolute top-[-3px] w-0.5 h-3.5 bg-primary/60 rounded-full" style={{ left: `${max}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{min}%</span>
        <span className={`font-medium ${tooLow ? 'text-destructive' : inRange ? 'text-primary' : 'text-amber-500'}`}>
          {value.toFixed(1)}%
        </span>
        <span>{max}%</span>
      </div>
    </div>
  );
}

export function IrrigationZoneCard({
  id, name, isActive, flowRate, duration,
  autoMode, currentHumidity, minHumidity, maxHumidity,
  onToggle, onUpdateName, onUpdateDuration, onUpdateFlowRate,
  onDelete, onToggleAutoMode, onUpdateThresholds,
}: IrrigationZoneCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [isEditingFlowRate, setIsEditingFlowRate] = useState(false);
  const [isEditingThresholds, setIsEditingThresholds] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [editedDuration, setEditedDuration] = useState(duration.toString());
  const [editedFlowRate, setEditedFlowRate] = useState(flowRate.toString());
  const [editedMin, setEditedMin] = useState(minHumidity.toString());
  const [editedMax, setEditedMax] = useState(maxHumidity.toString());
  const [thresholdErrors, setThresholdErrors] = useState<ThresholdErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSaveName = () => {
    if (editedName.trim()) { onUpdateName(id, editedName.trim()); setIsEditingName(false); }
  };
  const handleSaveDuration = () => {
    const v = parseInt(editedDuration);
    if (!isNaN(v) && v > 0) { onUpdateDuration(id, v); setIsEditingDuration(false); }
  };
  const handleSaveFlowRate = () => {
    const v = parseInt(editedFlowRate);
    if (!isNaN(v) && v > 0) { onUpdateFlowRate(id, v); setIsEditingFlowRate(false); }
  };
  const handleThresholdChange = (field: 'min' | 'max', val: string) => {
    const nextMin = field === 'min' ? val : editedMin;
    const nextMax = field === 'max' ? val : editedMax;
    if (field === 'min') setEditedMin(val); else setEditedMax(val);
    if (submitted) setThresholdErrors(validateThresholds(nextMin, nextMax));
  };
  const handleSaveThresholds = () => {
    setSubmitted(true);
    const errs = validateThresholds(editedMin, editedMax);
    setThresholdErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onUpdateThresholds(id, parseFloat(editedMin), parseFloat(editedMax));
    setIsEditingThresholds(false);
    setSubmitted(false);
  };
  const handleCancelThresholds = () => {
    setEditedMin(minHumidity.toString());
    setEditedMax(maxHumidity.toString());
    setThresholdErrors({});
    setSubmitted(false);
    setIsEditingThresholds(false);
  };

  const tooLow = currentHumidity < minHumidity;
  const tooHigh = currentHumidity > maxHumidity;
  const humidityStatus = tooLow ? 'baja' : tooHigh ? 'alta' : 'óptima';

  return (
    <div className={`rounded-xl border p-4 transition-all ${isActive ? 'bg-water-light border-water' : 'bg-card border-border'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Droplets className={`w-5 h-5 shrink-0 ${isActive ? 'text-water' : 'text-muted-foreground'}`} />
          {isEditingName ? (
            <div className="flex items-center gap-1 flex-1">
              <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)}
                className="flex-1 px-2 py-1 rounded border border-border bg-background text-foreground text-sm"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditedName(name); setIsEditingName(false); } }}
              />
              <button onClick={handleSaveName} className="p-1 text-plant-dark hover:bg-plant-light rounded"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setEditedName(name); setIsEditingName(false); }} className="p-1 text-destructive hover:bg-destructive/10 rounded"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <h3 className="text-foreground truncate">{name}</h3>
              <button onClick={() => setIsEditingName(true)} disabled={isActive} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded shrink-0">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {autoMode && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
              <Cpu className="w-3.5 h-3.5" />Auto
            </span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs ${isActive ? 'bg-water text-white' : 'bg-muted text-muted-foreground'}`}>
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Humidity gauge */}
      <div className="mb-3 bg-background rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Humedad del suelo</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${tooLow ? 'bg-destructive/10 text-destructive' : tooHigh ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
            {humidityStatus}
          </span>
        </div>
        <HumidityGauge value={currentHumidity} min={minHumidity} max={maxHumidity} />
      </div>

      {/* Threshold editor */}
      {isEditingThresholds ? (
        <div className="mb-3 bg-background rounded-lg p-3 space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Umbrales de humedad (%)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Mínimo</label>
              <input type="number" min={0} max={100} value={editedMin}
                onChange={e => handleThresholdChange('min', e.target.value)}
                className={`w-full mt-1 px-2 py-1.5 rounded border bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40 ${thresholdErrors.min ? 'border-destructive' : 'border-border'}`}
              />
              {thresholdErrors.min && <p className="text-xs text-destructive mt-0.5">{thresholdErrors.min}</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Máximo</label>
              <input type="number" min={0} max={100} value={editedMax}
                onChange={e => handleThresholdChange('max', e.target.value)}
                className={`w-full mt-1 px-2 py-1.5 rounded border bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40 ${thresholdErrors.max ? 'border-destructive' : 'border-border'}`}
              />
              {thresholdErrors.max && <p className="text-xs text-destructive mt-0.5">{thresholdErrors.max}</p>}
            </div>
          </div>
          {thresholdErrors.range && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3 h-3" />{thresholdErrors.range}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSaveThresholds} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-primary text-primary-foreground text-xs hover:opacity-90">
              <Check className="w-3 h-3" />Aplicar
            </button>
            <button onClick={handleCancelThresholds} className="px-3 py-1.5 rounded border border-border text-xs hover:bg-muted">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setEditedMin(minHumidity.toString()); setEditedMax(maxHumidity.toString()); setIsEditingThresholds(true); }}
          className="w-full mb-3 flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border hover:bg-muted transition-colors text-xs text-muted-foreground"
        >
          <span>Umbrales: {minHumidity}% – {maxHumidity}%</span>
          <Pencil className="w-3 h-3" />
        </button>
      )}

      {/* Flow / Duration */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-background rounded p-2">
          <p className="text-xs text-muted-foreground mb-1">Caudal</p>
          {isEditingFlowRate ? (
            <div className="flex items-center gap-1">
              <input type="number" value={editedFlowRate} onChange={e => setEditedFlowRate(e.target.value)}
                className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-sm" autoFocus min="1"
                onKeyDown={e => { if (e.key === 'Enter') handleSaveFlowRate(); if (e.key === 'Escape') { setEditedFlowRate(flowRate.toString()); setIsEditingFlowRate(false); } }}
              />
              <span className="text-foreground text-xs">L/min</span>
              <button onClick={handleSaveFlowRate} className="p-1 text-plant-dark hover:bg-plant-light rounded"><Check className="w-3 h-3" /></button>
              <button onClick={() => { setEditedFlowRate(flowRate.toString()); setIsEditingFlowRate(false); }} className="p-1 text-destructive hover:bg-destructive/10 rounded"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-foreground text-sm">{flowRate} L/min</p>
              <button onClick={() => setIsEditingFlowRate(true)} disabled={isActive} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"><Pencil className="w-3 h-3" /></button>
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
              <input type="number" value={editedDuration} onChange={e => setEditedDuration(e.target.value)}
                className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-sm" autoFocus min="1"
                onKeyDown={e => { if (e.key === 'Enter') handleSaveDuration(); if (e.key === 'Escape') { setEditedDuration(duration.toString()); setIsEditingDuration(false); } }}
              />
              <span className="text-foreground text-sm">min</span>
              <button onClick={handleSaveDuration} className="p-1 text-plant-dark hover:bg-plant-light rounded"><Check className="w-3 h-3" /></button>
              <button onClick={() => { setEditedDuration(duration.toString()); setIsEditingDuration(false); }} className="p-1 text-destructive hover:bg-destructive/10 rounded"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-foreground text-sm">{duration} min</p>
              <button onClick={() => setIsEditingDuration(true)} disabled={isActive} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"><Pencil className="w-3 h-3" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => onToggleAutoMode(id)}
          className={`flex items-center gap-1.5 px-3 py-3 rounded-lg text-sm transition-all ${autoMode ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20' : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'}`}>
          <Cpu className="w-4 h-4" />
          <span className="hidden sm:inline">Auto</span>
        </button>
        <button onClick={() => onToggle(id)} disabled={autoMode}
          className={`flex-1 py-3 rounded-lg transition-all ${autoMode ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60' : isActive ? 'bg-destructive text-destructive-foreground hover:opacity-90' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
          {isActive ? 'Detener Riego' : 'Iniciar Riego'}
        </button>
        <button onClick={() => onDelete(id)} disabled={isActive}
          className={`p-3 rounded-lg transition-all ${isActive ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground'}`}>
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}