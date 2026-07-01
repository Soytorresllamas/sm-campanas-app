export type TrackKey = "S" | "C" | "T";
export type StatusKey = "todo" | "doing" | "done" | "review" | "risk";
export type GroupBy = "module" | "track";
export type Zoom = "trimestre" | "mes" | "semana";
export type SyncState = "loading" | "saving" | "synced" | "error";
export type DragMode = "move" | "l" | "r";

export interface Task {
  id: string;
  module: string;
  name: string;
  detail: string;
  track: TrackKey;
  /** Acción de baja intensidad (always-on, upsell) — se pinta con menor opacidad. */
  soft: boolean;
  /** Fecha ISO (YYYY-MM-DD). En hitos, start === end. */
  start: string;
  end: string;
  owner: string;
  status: StatusKey;
  progress: number;
  milestone: boolean;
  dependsOn: string[];
}

export interface TrackMeta { label: string; hex: string }
export interface StatusMeta { label: string; hex: string }
export interface SyncMeta { label: string; hex: string }

export interface GanttGroup {
  key: string;
  label: string;
  color: string;
  items: Task[];
}

export interface ArrowGeom {
  key: string;
  x1: number; y1: number; x2: number; y2: number;
  conflict: boolean;
}
