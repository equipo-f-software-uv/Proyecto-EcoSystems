export interface ValveEvent {
  id: string;
  zoneId: number;
  zoneName: string;
  action: 'open' | 'close';
  reason: 'auto' | 'manual';
  triggerDetail: string;
  timestamp: number;
}

export type ErrorSeverity = 'critical' | 'error' | 'warning';
export type ErrorCategory = 'hardware' | 'connection' | 'database' | 'backend' | 'sensor';

export interface ErrorLog {
  id: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  origin: string;
  originId: string;
  title: string;
  detail: string;
  resolved: boolean;
  timestamp: number;
}
