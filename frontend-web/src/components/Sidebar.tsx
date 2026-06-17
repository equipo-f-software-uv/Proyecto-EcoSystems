import { Droplets, BarChart3, Cloud, Bell, Menu, X, Leaf } from 'lucide-react';

type View = 'control' | 'statistics' | 'weather' | 'notifications';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ currentView, onViewChange, isOpen, onToggle }: SidebarProps) {
  const menuItems = [
    { id: 'control' as View, label: 'Control de Riego', icon: Droplets },
    { id: 'statistics' as View, label: 'Gráficas', icon: BarChart3 },
    { id: 'weather' as View, label: 'Clima', icon: Cloud },
    { id: 'notifications' as View, label: 'Notificaciones', icon: Bell },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg md:hidden"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-card border-r border-border shadow-xl z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-64`}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6">
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="w-8 h-8" />
            <h2>EcoSystems</h2>
          </div>
          <p className="text-sm opacity-90">Sistema de Riego Inteligente</p>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isNotifications = item.id === 'notifications';

            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  if (window.innerWidth < 768) {
                    onToggle();
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {isNotifications && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      3
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Versión 1.0.0
          </p>
        </div>
      </div>
    </>
  );
}