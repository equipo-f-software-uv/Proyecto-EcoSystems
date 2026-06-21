import { Droplets, BarChart3, Cloud, Bell, Menu, X, Leaf, Sprout, ShieldAlert } from 'lucide-react';

type View = 'control' | 'statistics' | 'weather' | 'notifications' | 'crops' | 'diagnostics';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onToggle: () => void;
  valveEventCount: number;
  activeErrorCount: number;
  hasCritical: boolean;
}

export function Sidebar({ currentView, onViewChange, isOpen, onToggle, valveEventCount, activeErrorCount, hasCritical }: SidebarProps) {
  const menuItems: { id: View; label: string; icon: React.ElementType }[] = [
    { id: 'control',       label: 'Control de Riego',   icon: Droplets },
    { id: 'statistics',    label: 'Gráficas',            icon: BarChart3 },
    { id: 'weather',       label: 'Clima',               icon: Cloud },
    { id: 'notifications', label: 'Notificaciones',      icon: Bell },
    { id: 'crops',         label: 'Perfiles de Cultivo', icon: Sprout },
    { id: 'diagnostics',   label: 'Diagnóstico',         icon: ShieldAlert },
  ];

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg md:hidden"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onToggle} />
      )}

      <div className={`fixed top-0 left-0 h-full bg-card border-r border-border shadow-xl z-40 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 w-64`}>
        <div className="bg-primary text-primary-foreground p-6">
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="w-8 h-8" />
            <h2>EcoSystems</h2>
          </div>
          <p className="text-sm opacity-90">Sistema de Riego Inteligente</p>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            let badge: React.ReactNode = null;

            if (item.id === 'notifications' && valveEventCount > 0) {
              badge = (
                <span className="ml-auto bg-destructive text-white text-xs rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1">
                  {valveEventCount > 9 ? '9+' : valveEventCount}
                </span>
              );
            }
            if (item.id === 'diagnostics' && activeErrorCount > 0) {
              badge = (
                <span className={`ml-auto text-white text-xs rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1 ${hasCritical ? 'bg-destructive' : 'bg-orange-500'}`}>
                  {activeErrorCount > 9 ? '9+' : activeErrorCount}
                </span>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => { onViewChange(item.id); if (window.innerWidth < 768) onToggle(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {badge}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">Versión 1.0.0</p>
        </div>
      </div>
    </>
  );
}