import { X } from 'lucide-react';
import { useState } from 'react';

interface AddZoneModalProps {
  onClose: () => void;
  onAdd: (name: string, flowRate: number, duration: number) => void;
}

export function AddZoneModal({ onClose, onAdd }: AddZoneModalProps) {
  const [name, setName] = useState('');
  const [flowRate, setFlowRate] = useState('40');
  const [duration, setDuration] = useState('30');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const flow = parseInt(flowRate);
    const dur = parseInt(duration);
    if (name.trim() && !isNaN(flow) && flow > 0 && !isNaN(dur) && dur > 0) {
      onAdd(name.trim(), flow, dur);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-foreground">Nueva Zona de Riego</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block mb-2 text-foreground">Nombre de la Zona</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Zona Norte"
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
              autoFocus required
            />
          </div>
          <div>
            <label className="block mb-2 text-foreground">Caudal (L/min)</label>
            <input
              type="number" value={flowRate} onChange={e => setFlowRate(e.target.value)}
              min="1"
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-foreground">Duración (minutos)</label>
            <input
              type="number" value={duration} onChange={e => setDuration(e.target.value)}
              min="1"
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border text-foreground hover:bg-muted">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
              Agregar Zona
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}