import type { TrackKey, StatusKey, TrackMeta, StatusMeta, SyncMeta, Zoom, SyncState } from './types';

export const TRACKS: Record<TrackKey, TrackMeta> = {
  S: { label: 'SMART', hex: '#2563B0' },
  C: { label: 'CORE', hex: '#2C8A7B' },
  T: { label: 'Transversal', hex: '#8C92A0' },
};

export const STATUS: Record<StatusKey, StatusMeta> = {
  todo: { label: 'Por hacer', hex: '#9AA0AB' },
  doing: { label: 'En curso', hex: '#2563B0' },
  done: { label: 'Hecho', hex: '#157A38' },
  review: { label: 'Revisar', hex: '#B5841C' },
  risk: { label: 'En riesgo', hex: '#BE1409' },
};

export const OWNERS = ['Marketing', 'Comercial SMART', 'Comercial CORE', 'Inteligencia comercial', 'Dirección'];

export const MODULES = [
  '0 · Inteligencia y segmentación', 'Assets, mensajes y oferta', '1 · SMART · Activación temprana',
  '2 · SMART · Cierre', '3 · SMART · Upsell didácticas', '4 · CORE · Apertura + gancho',
  '5 · CORE · Nurturing y conversión', '6 · CORE · Reactivación «Sin actividad»',
  '7 · Medición y cierre auditado', '8 · Always-on: contenido y retención',
];

export const PPD: Record<Zoom, number> = { trimestre: 2.4, mes: 5.2, semana: 14 };

export const SYNC: Record<SyncState, SyncMeta> = {
  loading: { label: 'Cargando…', hex: '#B5841C' },
  saving: { label: 'Guardando…', hex: '#B5841C' },
  synced: { label: 'Sincronizado ✓', hex: '#157A38' },
  error: { label: 'Sin conexión · local', hex: '#BE1409' },
};

export const HEAD_H = 40, GROUP_H = 30, ROW_H = 30, BAR_H = 17;
export const LBL = 464;
