import { useState } from 'react';
import {
  Leaf, Plus, Pencil, Trash2, X, Check, AlertCircle,
  Droplets, ChevronDown, Sprout
} from 'lucide-react';

export interface CropProfile {
  id: number;
  name: string;
  minHumidity: number;
  maxHumidity: number;
  color: string;
  createdAt: string;
}

const PROFILE_COLORS = [
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-lime-500', 'bg-cyan-500', 'bg-blue-500',
];

const INITIAL_PROFILES: CropProfile[] = [
  { id: 1, name: 'Palto', minHumidity: 55, maxHumidity: 75, color: 'bg-green-500', createdAt: '2026-05-10' },
  { id: 2, name: 'Tomate', minHumidity: 60, maxHumidity: 80, color: 'bg-emerald-500', createdAt: '2026-05-12' },
  { id: 3, name: 'Maíz', minHumidity: 40, maxHumidity: 65, color: 'bg-lime-500', createdAt: '2026-05-15' },
];

interface FormState {
  name: string;
  minHumidity: string;
  maxHumidity: string;
}

interface FormErrors {
  name?: string;
  minHumidity?: string;
  maxHumidity?: string;
  range?: string;
}

interface AssignmentState {
  profileId: number | null;
  zoneId: number | null;
}

const MOCK_ZONES = [
  { id: 1, name: 'Zona Norte' },
  { id: 2, name: 'Zona Sur' },
  { id: 3, name: 'Zona Este' },
  { id: 4, name: 'Zona Oeste' },
  { id: 5, name: 'Invernadero 1' },
  { id: 6, name: 'Invernadero 2' },
];

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) {
    errors.name = 'El nombre del cultivo es obligatorio.';
  }
  const min = parseFloat(form.minHumidity);
  const max = parseFloat(form.maxHumidity);
  if (form.minHumidity === '') {
    errors.minHumidity = 'La humedad mínima es obligatoria.';
  } else if (isNaN(min) || min < 0) {
    errors.minHumidity = 'Debe ser un valor mayor o igual a 0.';
  } else if (min > 100) {
    errors.minHumidity = 'No puede superar 100%.';
  }
  if (form.maxHumidity === '') {
    errors.maxHumidity = 'La humedad máxima es obligatoria.';
  } else if (isNaN(max) || max < 0) {
    errors.maxHumidity = 'Debe ser un valor mayor o igual a 0.';
  } else if (max > 100) {
    errors.maxHumidity = 'No puede superar 100%.';
  }
  if (!errors.minHumidity && !errors.maxHumidity && !isNaN(min) && !isNaN(max)) {
    if (min >= max) {
      errors.range = 'La humedad mínima debe ser menor que la máxima.';
    }
  }
  return errors;
}

function HumidityBar({ min, max }: { min: number; max: number }) {
  return (
    <div className="relative h-2 rounded-full bg-muted overflow-hidden w-full">
      <div
        className="absolute h-full rounded-full bg-primary opacity-60"
        style={{ left: `${min}%`, width: `${max - min}%` }}
      />
    </div>
  );
}

interface ProfileFormProps {
  initial?: CropProfile;
  onSave: (name: string, min: number, max: number) => void;
  onCancel: () => void;
}

function ProfileForm({ initial, onSave, onCancel }: ProfileFormProps) {
  const [form, setForm] = useState<FormState>(({
    name: initial?.name ?? '',
    minHumidity: initial ? String(initial.minHumidity) : '',
    maxHumidity: initial ? String(initial.maxHumidity) : '',
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof FormState, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (submitted) setErrors(validate(next));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSave(form.name.trim(), parseFloat(form.minHumidity), parseFloat(form.maxHumidity));
  };

  const minVal = parseFloat(form.minHumidity);
  const maxVal = parseFloat(form.maxHumidity);
  const previewOk = !isNaN(minVal) && !isNaN(maxVal) && minVal >= 0 && maxVal <= 100 && minVal < maxVal;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-md">
      <h3 className="mb-4 text-foreground flex items-center gap-2">
        <Sprout className="w-5 h-5 text-primary" />
        {initial ? 'Editar perfil' : 'Nuevo perfil de cultivo'}
      </h3>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Nombre del cultivo *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="Ej. Palto, Tomate, Maíz..."
            className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/40 ${errors.name ? 'border-destructive' : 'border-border'}`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.name}
            </p>
          )}
        </div>

        {/* Humidity range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Humedad mínima (%) *</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.minHumidity}
              onChange={e => handleChange('minHumidity', e.target.value)}
              placeholder="0 – 100"
              className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40 ${errors.minHumidity ? 'border-destructive' : 'border-border'}`}
            />
            {errors.minHumidity && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.minHumidity}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Humedad máxima (%) *</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.maxHumidity}
              onChange={e => handleChange('maxHumidity', e.target.value)}
              placeholder="0 – 100"
              className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/40 ${errors.maxHumidity ? 'border-destructive' : 'border-border'}`}
            />
            {errors.maxHumidity && (
              <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.maxHumidity}
              </p>
            )}
          </div>
        </div>

        {errors.range && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errors.range}
          </div>
        )}

        {/* Live preview bar */}
        {previewOk && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground mb-1">Vista previa del rango</p>
            <HumidityBar min={minVal} max={maxVal} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{minVal}%</span>
              <span>{maxVal}%</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm"
          >
            <Check className="w-4 h-4" />
            {initial ? 'Guardar cambios' : 'Crear perfil'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface AssignModalProps {
  profile: CropProfile;
  currentAssignment: Record<number, number>;
  onAssign: (profileId: number, zoneId: number) => void;
  onClose: () => void;
}

function AssignModal({ profile, currentAssignment, onAssign, onClose }: AssignModalProps) {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAssign = () => {
    if (!selectedZone) return;
    onAssign(profile.id, selectedZone);
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm p-5 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary" />
            Asignar a sector
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <p className="text-foreground">¡Perfil asignado correctamente!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Los umbrales de <strong>{profile.name}</strong> están activos en la zona seleccionada.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              Selecciona el sector al que aplicar el perfil{' '}
              <span className="font-medium text-foreground">"{profile.name}"</span>
              {' '}({profile.minHumidity}% – {profile.maxHumidity}%)
            </p>

            <div className="space-y-2 mb-4">
              {MOCK_ZONES.map(zone => {
                const hasProfile = Object.values(currentAssignment).includes(zone.id)
                  && currentAssignment[profile.id] !== zone.id;
                return (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZone(zone.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      selectedZone === zone.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{zone.name}</span>
                    {currentAssignment[profile.id] === zone.id && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">actual</span>
                    )}
                    {hasProfile && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">otro perfil</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleAssign}
              disabled={!selectedZone}
              className={`w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-all ${
                selectedZone
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              Confirmar asignación
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function CropProfilesView() {
  const [profiles, setProfiles] = useState<CropProfile[]>(INITIAL_PROFILES);
  const [nextId, setNextId] = useState(4);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CropProfile | null>(null);
  const [assigningProfile, setAssigningProfile] = useState<CropProfile | null>(null);
  const [assignments, setAssignments] = useState<Record<number, number>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const colorForIndex = (i: number) => PROFILE_COLORS[i % PROFILE_COLORS.length];

  const handleCreate = (name: string, min: number, max: number) => {
    const newProfile: CropProfile = {
      id: nextId,
      name,
      minHumidity: min,
      maxHumidity: max,
      color: colorForIndex(profiles.length),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProfiles([...profiles, newProfile]);
    setNextId(nextId + 1);
    setShowForm(false);
  };

  const handleEdit = (name: string, min: number, max: number) => {
    if (!editingProfile) return;
    setProfiles(profiles.map(p =>
      p.id === editingProfile.id ? { ...p, name, minHumidity: min, maxHumidity: max } : p
    ));
    setEditingProfile(null);
  };

  const handleDelete = (id: number) => {
    setProfiles(profiles.filter(p => p.id !== id));
    const newAssign = { ...assignments };
    delete newAssign[id];
    setAssignments(newAssign);
    setDeleteConfirm(null);
  };

  const handleAssign = (profileId: number, zoneId: number) => {
    setAssignments({ ...assignments, [profileId]: zoneId });
  };

  const assignedZoneName = (profileId: number) => {
    const zoneId = assignments[profileId];
    if (!zoneId) return null;
    return MOCK_ZONES.find(z => z.id === zoneId)?.name ?? null;
  };

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <Leaf className="w-8 h-8" />
          <div>
            <p className="text-sm opacity-75">EcoSystems</p>
            <h1>Perfiles de Cultivo</h1>
          </div>
        </div>
        <p className="text-sm opacity-90">
          {profiles.length} perfil{profiles.length !== 1 ? 'es' : ''} configurado{profiles.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="px-4 mt-6 space-y-4 max-w-2xl">
        {/* Create button */}
        {!showForm && !editingProfile && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Crear nuevo perfil de cultivo
          </button>
        )}

        {/* Create form */}
        {showForm && (
          <ProfileForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Profile cards */}
        {profiles.length === 0 && !showForm && (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Leaf className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No hay perfiles de cultivo aún</p>
          </div>
        )}

        {profiles.map((profile, i) => {
          const isEditing = editingProfile?.id === profile.id;
          const zoneName = assignedZoneName(profile.id);

          if (isEditing) {
            return (
              <ProfileForm
                key={profile.id}
                initial={profile}
                onSave={handleEdit}
                onCancel={() => setEditingProfile(null)}
              />
            );
          }

          return (
            <div key={profile.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full ${colorForIndex(i)} flex items-center justify-center shrink-0`}>
                    <Leaf className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground truncate">{profile.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Humedad: {profile.minHumidity}% – {profile.maxHumidity}%
                    </p>
                    {zoneName && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <Droplets className="w-3 h-3" />
                        {zoneName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setAssigningProfile(profile)}
                    title="Asignar a sector"
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Droplets className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setEditingProfile(profile); setShowForm(false); }}
                    title="Editar"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(profile.id)}
                    title="Eliminar"
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Humidity range bar */}
              <div className="mt-3">
                <HumidityBar min={profile.minHumidity} max={profile.maxHumidity} />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className="text-primary">
                    {profile.minHumidity}% – {profile.maxHumidity}%
                  </span>
                  <span>100%</span>
                </div>
              </div>

              {/* Delete confirm inline */}
              {deleteConfirm === profile.id && (
                <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive flex-1">¿Eliminar "{profile.name}"?</p>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="text-xs bg-destructive text-destructive-foreground px-3 py-1 rounded-md hover:opacity-90"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="text-xs border border-border px-3 py-1 rounded-md hover:bg-muted"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assign modal */}
      {assigningProfile && (
        <AssignModal
          profile={assigningProfile}
          currentAssignment={assignments}
          onAssign={handleAssign}
          onClose={() => setAssigningProfile(null)}
        />
      )}
    </div>
  );
}
