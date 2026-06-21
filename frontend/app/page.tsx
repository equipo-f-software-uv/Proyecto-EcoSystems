'use client';

import { useState, useCallback } from 'react';
import { ControlView } from './components/ControlView';
import { StatisticsView } from './components/StatisticsView';
import { WeatherView } from './components/WeatherView';
import { NotificationsView } from './components/NotificationsView';
import { CropProfilesView } from './components/CropProfilesView';
import { DiagnosticsView, SEED_ERRORS } from './components/DiagnosticsView';
import { Sidebar } from './components/Sidebar';
import { BASE_WEATHER, computeRecommendation } from './weather';
import type { ValveEvent, ErrorLog } from './types';

type View = 'control' | 'statistics' | 'weather' | 'notifications' | 'crops' | 'diagnostics';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('control');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [valveEvents, setValveEvents] = useState<ValveEvent[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>(
    [...SEED_ERRORS].sort((a, b) => b.timestamp - a.timestamp)
  );

  const handleValveEvent = useCallback((event: ValveEvent) => {
    setValveEvents(prev => [event, ...prev].slice(0, 200));
  }, []);

  const handleAddError = useCallback((error: ErrorLog) => {
    setErrorLogs(prev => [error, ...prev].slice(0, 500));
  }, []);

  const handleResolveError = useCallback((id: string) => {
    setErrorLogs(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
  }, []);

  const handleDeleteError = useCallback((id: string) => {
    setErrorLogs(prev => prev.filter(e => e.id !== id));
  }, []);

  const weatherRec = computeRecommendation(BASE_WEATHER);
  const activeErrorCount = errorLogs.filter(e => !e.resolved).length;
  const hasCritical      = errorLogs.some(e => e.severity === 'critical' && !e.resolved);

  const renderView = () => {
    switch (currentView) {
      case 'control':
        return <ControlView onValveEvent={handleValveEvent} weatherRec={weatherRec} />;
      case 'statistics':
        return <StatisticsView />;
      case 'weather':
        return <WeatherView />;
      case 'notifications':
        return <NotificationsView valveEvents={valveEvents} />;
      case 'crops':
        return <CropProfilesView />;
      case 'diagnostics':
        return (
          <DiagnosticsView
            errorLogs={errorLogs}
            onAddError={handleAddError}
            onResolveError={handleResolveError}
            onDeleteError={handleDeleteError}
          />
        );
      default:
        return <ControlView onValveEvent={handleValveEvent} weatherRec={weatherRec} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        valveEventCount={valveEvents.length}
        activeErrorCount={activeErrorCount}
        hasCritical={hasCritical}
      />
      <div className="md:ml-64">
        {renderView()}
      </div>
    </div>
  );
}
