import { supabase, GANTT_TABLE, GANTT_ROW } from './supabase';
import type { Task } from '../features/gantt/types';

const LS_KEY = 'sm-gantt-26-27-v1';

export const loadLocal = (): Task[] | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p; }
  } catch { /* noop */ }
  return null;
};
export const saveLocal = (tasks: Task[]): void => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(tasks)); } catch { /* noop */ }
};

export type LoadRemoteResult =
  | { tasks: Task[]; source: 'remote'; error?: undefined }
  | { tasks: null; source: 'none'; error?: unknown };

export async function loadRemote(): Promise<LoadRemoteResult> {
  try {
    const { data, error } = await supabase.from(GANTT_TABLE).select('data').eq('id', GANTT_ROW).maybeSingle();
    if (error) return { tasks: null, source: 'none', error };
    const tasks = (data?.data as { tasks?: Task[] } | null)?.tasks;
    if (Array.isArray(tasks) && tasks.length) return { tasks, source: 'remote' };
    return { tasks: null, source: 'none' };
  } catch (e) {
    return { tasks: null, source: 'none', error: e };
  }
}

export async function saveRemote(tasks: Task[]): Promise<{ ok: boolean; error?: unknown }> {
  try {
    const { error } = await supabase.from(GANTT_TABLE)
      .upsert({ id: GANTT_ROW, data: { tasks }, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    return { ok: !error, error };
  } catch (e) {
    return { ok: false, error: e };
  }
}
