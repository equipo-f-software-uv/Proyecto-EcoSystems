import { Bell, CloudRain, Droplets, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Notification {
  id: number;
  type: 'warning' | 'success' | 'info' | 'alert';
  title: string;
  message: string;
  time: string;
  icon: 'rain' | 'water' | 'check' | 'alert' | 'info';
}

const notifications: Notification[] = [
  {
    id: 1,
    type: 'info',
    title: 'Lluvia esperada mañana',
    message: 'Se pronostica lluvia para mañana miércoles con 75% de probabilidad. No será necesario regar las zonas exteriores.',
    time: 'Hace 30 min',
    icon: 'rain',
  },
  {
    id: 2,
    type: 'success',
    title: 'No es necesario regar hoy',
    message: 'Las condiciones climáticas actuales son óptimas. La humedad del suelo está en 68%, dentro del rango ideal.',
    time: 'Hace 2 horas',
    icon: 'check',
  },
  {
    id: 3,
    type: 'warning',
    title: 'Programar riego para el viernes',
    message: 'Se espera clima seco durante el jueves y viernes. Recomendamos programar riego para el viernes en la mañana.',
    time: 'Hace 3 horas',
    icon: 'water',
  },
  {
    id: 4,
    type: 'alert',
    title: 'Alerta de sequía',
    message: 'No se ha detectado lluvia en los últimos 7 días. Considere aumentar la frecuencia de riego en un 15%.',
    time: 'Ayer',
    icon: 'alert',
  },
  {
    id: 5,
    type: 'info',
    title: 'Análisis semanal',
    message: 'Esta semana se consumieron 3,190 litros de agua, un 12% menos que la semana anterior. Excelente eficiencia.',
    time: 'Hace 2 días',
    icon: 'info',
  },
];

export function NotificationsView() {
  const getIcon = (icon: string) => {
    const iconClass = "w-5 h-5";
    switch (icon) {
      case 'rain':
        return <CloudRain className={iconClass} />;
      case 'water':
        return <Droplets className={iconClass} />;
      case 'check':
        return <CheckCircle className={iconClass} />;
      case 'alert':
        return <AlertTriangle className={iconClass} />;
      case 'info':
        return <Info className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50';
      case 'success':
        return 'border-l-4 border-l-plant bg-plant-light';
      case 'alert':
        return 'border-l-4 border-l-destructive bg-red-50';
      case 'info':
        return 'border-l-4 border-l-water bg-water-light';
      default:
        return 'border-l-4 border-l-muted';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'text-yellow-600';
      case 'success':
        return 'text-plant-dark';
      case 'alert':
        return 'text-destructive';
      case 'info':
        return 'text-water';
      default:
        return 'text-muted-foreground';
    }
  };

  const unreadCount = 3;

  return (
    <div className="pb-6">
      <div className="bg-primary text-primary-foreground px-4 py-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-75">EcoSystems</p>
            <h1>Notificaciones</h1>
            <p className="text-sm opacity-90">Recomendaciones y alertas</p>
          </div>
          {unreadCount > 0 && (
            <div className="bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-6">
        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <h3 className="text-foreground mb-2">🌦️ Recomendación de hoy</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Basado en las condiciones climáticas actuales y el pronóstico:
          </p>
          <div className="bg-plant-light border border-plant rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-plant-dark flex-shrink-0 mt-1" />
              <div>
                <p className="text-plant-dark mb-1">No regar hoy - Sábado 19 de Abril</p>
                <p className="text-sm text-foreground">
                  La humedad ambiental está en 65% y se espera llovizna por la tarde.
                  Las plantas tienen suficiente agua. Próximo riego recomendado: Lunes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <h2 className="mb-4 text-muted-foreground">Todas las notificaciones</h2>

        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border border-border p-4 ${getCardStyle(notification.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className={`${getIconColor(notification.type)} flex-shrink-0 mt-1`}>
                  {getIcon(notification.icon)}
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground mb-1">{notification.title}</h3>
                  <p className="text-sm text-foreground/80 mb-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}