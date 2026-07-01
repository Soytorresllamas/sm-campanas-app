import { supabase, GANTT_TABLE, GANTT_ROW } from './supabase.js'

const LS_KEY = 'sm-gantt-26-27-v1'

export const loadLocal = () => {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p } } catch (e) { /* noop */ }
  return null
}
export const saveLocal = (tasks) => { try { localStorage.setItem(LS_KEY, JSON.stringify(tasks)) } catch (e) { /* noop */ } }

// Devuelve { tasks, source: 'remote'|'local'|'none', error }
export async function loadRemote() {
  try {
    const { data, error } = await supabase.from(GANTT_TABLE).select('data').eq('id', GANTT_ROW).maybeSingle()
    if (error) return { tasks: null, source: 'none', error }
    if (data && Array.isArray(data.data?.tasks) && data.data.tasks.length) return { tasks: data.data.tasks, source: 'remote' }
    return { tasks: null, source: 'none' }
  } catch (e) { return { tasks: null, source: 'none', error: e } }
}

export async function saveRemote(tasks) {
  try {
    const { error } = await supabase.from(GANTT_TABLE)
      .upsert({ id: GANTT_ROW, data: { tasks }, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    return { ok: !error, error }
  } catch (e) { return { ok: false, error: e } }
}
