import { supabase, PLANEACION_TABLE, PLANEACION_ROW } from './supabase';
import type { PlaneacionData } from '../data/planeacion';

const LS_KEY = 'sm-planeacion-26-27-v1';

const valid = (p: unknown): p is PlaneacionData =>
  !!p && Array.isArray((p as PlaneacionData).asesores) && Array.isArray((p as PlaneacionData).colegios);

export const loadLocal = (): PlaneacionData | null => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (valid(p)) return p;
  } catch { /* noop */ }
  return null;
};

export const saveLocal = (data: PlaneacionData): void => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* noop */ }
};

export type LoadRemoteResult =
  | { data: PlaneacionData; source: 'remote'; error?: undefined }
  | { data: null; source: 'none'; error?: unknown };

export async function loadRemote(): Promise<LoadRemoteResult> {
  try {
    const { data, error } = await supabase.from(PLANEACION_TABLE).select('data').eq('id', PLANEACION_ROW).maybeSingle();
    if (error) return { data: null, source: 'none', error };
    const payload = data?.data as unknown;
    if (valid(payload) && payload.colegios.length) return { data: payload, source: 'remote' };
    return { data: null, source: 'none' };
  } catch (e) {
    return { data: null, source: 'none', error: e };
  }
}

export async function saveRemote(data: PlaneacionData): Promise<{ ok: boolean; error?: unknown }> {
  try {
    const { error } = await supabase.from(PLANEACION_TABLE)
      .upsert({ id: PLANEACION_ROW, data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    return { ok: !error, error };
  } catch (e) {
    return { ok: false, error: e };
  }
}
