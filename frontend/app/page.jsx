'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ControlView } from './components/ControlView';
import { StatisticsView } from './components/StatisticsView';
import { WeatherView } from './components/WeatherView';
import { NotificationsView } from './components/NotificationsView';
import { CropProfilesView } from './components/CropProfilesView';
import { DiagnosticsView, SEED_ERRORS } from './components/DiagnosticsView';
import { computeRecommendation, BASE_WEATHER } from './weather';

export default function Home() {
  const [currentView, setCurrentView] = useState('crops');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [valveEvents, setValveEvents] = useState([]);
  const [errorLogs, setErrorLogs] = useState(SEED_ERRORS);
  const [weatherRec, setWeatherRec] = useState(computeRecommendation(BASE_WEATHER));

  // Handle new valve action events from ControlView
  const handleValveEvent = (event) => {
    setValveEvents((prev) => [event, ...prev]);
  };

  // Error management for DiagnosticsView
  const handleAddError = (error) => {
    setErrorLogs((prev) => [error, ...prev]);
  };

  const handleResolveError = (id) => {
    setErrorLogs((prev) =>
      prev.map((err) => (err.id === id ? { ...err, resolved: true } : err))
    );
  };

  const handleDeleteError = (id) => {
    setErrorLogs((prev) => prev.filter((err) => err.id !== id));
  };

  // Derive counts
  const activeErrorCount = errorLogs.filter((e) => !e.resolved).length;
  const hasCritical = errorLogs.some((e) => !e.resolved && e.severity === 'critical');

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        valveEventCount={valveEvents.length}
        activeErrorCount={activeErrorCount}
        hasCritical={hasCritical}
      />
      <main className="flex-1 md:pl-64 transition-all">
        {currentView === 'control' && (
          <ControlView onValveEvent={handleValveEvent} weatherRec={weatherRec} />
        )}
        {currentView === 'statistics' && <StatisticsView />}
        {currentView === 'weather' && <WeatherView onRecChange={setWeatherRec} />}
        {currentView === 'notifications' && (
          <NotificationsView valveEvents={valveEvents} />
        )}
        {currentView === 'crops' && <CropProfilesView />}
        {currentView === 'diagnostics' && (
          <DiagnosticsView
            errorLogs={errorLogs}
            onAddError={handleAddError}
            onResolveError={handleResolveError}
            onDeleteError={handleDeleteError}
          />
        )}
      </main>
    </div>
  );
}
