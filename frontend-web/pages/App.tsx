import { useState } from 'react';
import { ControlView } from './components/ControlView';
import { StatisticsView } from './components/StatisticsView';
import { WeatherView } from './components/WeatherView';
import { NotificationsView } from './components/NotificationsView';
import { Sidebar } from './components/Sidebar';

type View = 'control' | 'statistics' | 'weather' | 'notifications';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('control');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'control':
        return <ControlView />;
      case 'statistics':
        return <StatisticsView />;
      case 'weather':
        return <WeatherView />;
      case 'notifications':
        return <NotificationsView />;
      default:
        return <ControlView />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="md:ml-64">
        {renderView()}
      </div>
    </div>
  );
}
