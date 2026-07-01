import { supabase, GANTT_TABLE, GANTT_ROW } from './supabase';
import type { Task } from '../features/gantt/types';

const LS_KEY = 'sm-gantt-26-27-v1';

export interface GanttData {
  tasks: Task[];
  modules: string[];
  owners: string[];
}

export const loadLocal = (): GanttData | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    // formato viejo (antes de módulos/responsables editables): un arreglo plano de tareas.
    if (Array.isArray(p) && p.length) return { tasks: p, modules: [], owners: [] };
    if (p && Array.isArray(p.tasks) && p.tasks.length) {
      return { tasks: p.tasks, modules: p.modules ?? [], owners: p.owners ?? [] };
    }
  } catch { /* noop */ }
  return null;
};
export const saveLocal = (data: GanttData): void => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* noop */ }
};

export type LoadRemoteResult =
  | { data: GanttData; source: 'remote'; error?: undefined }
  | { data: null; source: 'none'; error?: unknown };

export async function loadRemote(): Promise<LoadRemoteResult> {
  try {
    const { data, error } = await supabase.from(GANTT_TABLE).select('data').eq('id', GANTT_ROW).maybeSingle();
    if (error) return { data: null, source: 'none', error };
    const payload = data?.data as Partial<GanttData> | null;
    if (payload && Array.isArray(payload.tasks) && payload.tasks.length) {
      return { data: { tasks: payload.tasks, modules: payload.modules ?? [], owners: payload.owners ?? [] }, source: 'remote' };
    }
    return { data: null, source: 'none' };
  } catch (e) {
    return { data: null, source: 'none', error: e };
  }
}

export async function saveRemote(data: GanttData): Promise<{ ok: boolean; error?: unknown }> {
  try {
    const { error } = await supabase.from(GANTT_TABLE)
      .upsert({ id: GANTT_ROW, data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    return { ok: !error, error };
  } catch (e) {
    return { ok: false, error: e };
  }
}
