import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task, SyncState, StatusKey } from './types';
import { loadLocal, saveLocal, loadRemote, saveRemote } from '../../lib/ganttStore';
import { buildSeed } from './seed';
import { TRACKS, STATUS, OWNERS, MODULES } from './constants';
import { MS, diffDays, parse, toISO } from './dateUtils';
import { useHistory } from './useHistory';

/** Estado + sincronización (local + Supabase) + mutaciones del tablero del Gantt. */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => loadLocal() || buildSeed());
  const [sync, setSync] = useState<SyncState>('loading');

  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  const ready = useRef(false);
  const skipSave = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { historySize, pushHistory, discardLast, undo } = useHistory(() => tasksRef.current, setTasks);

  // carga inicial desde Supabase (con lo local ya pintado al instante)
  useEffect(() => {
    let alive = true;
    loadRemote().then(async (res) => {
      if (!alive) return;
      if (res.source === 'remote') { skipSave.current = true; setTasks(res.tasks); setSync('synced'); }
      else if (res.error) { setSync('error'); }
      else { const { ok } = await saveRemote(tasksRef.current); setSync(ok ? 'synced' : 'error'); }
      ready.current = true;
    });
    return () => { alive = false; };
  }, []);

  // guardado: local inmediato + remoto con debounce
  useEffect(() => {
    saveLocal(tasks);
    if (!ready.current) return;
    if (skipSave.current) { skipSave.current = false; return; }
    setSync((s) => s === 'error' ? 'error' : 'saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { ok } = await saveRemote(tasksRef.current);
      setSync(ok ? 'synced' : 'error');
    }, 700);
    return () => clearTimeout(saveTimer.current);
  }, [tasks]);

  const patch = useCallback((next: Task) => setTasks((ts) => ts.map((t) => t.id === next.id ? next : t)), []);

  const del = useCallback((id: string) => {
    pushHistory();
    setTasks((ts) => ts.filter((t) => t.id !== id)
      .map((t) => t.dependsOn.includes(id) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== id) } : t));
  }, [pushHistory]);

  const addTask = useCallback((): string => {
    pushHistory();
    const id = 'u' + Date.now().toString(36);
    const start = Date.UTC(2026, 8, 1);
    const nt: Task = {
      id, module: MODULES[0], name: 'Nueva acción', detail: '', track: 'T', soft: false,
      start: toISO(start), end: toISO(start + 20 * MS), owner: OWNERS[0], status: 'todo',
      progress: 0, milestone: false, dependsOn: [],
    };
    setTasks((ts) => [...ts, nt]);
    return id;
  }, [pushHistory]);

  // dependencias: evita self y ciclo directo (que la predecesora ya dependa de esta)
  const addDep = useCallback((task: Task, pid: string) => {
    if (!pid || pid === task.id) return;
    const pred = tasksRef.current.find((t) => t.id === pid);
    if (pred?.dependsOn.includes(task.id)) { window.alert('Eso crearía una dependencia circular.'); return; }
    if (task.dependsOn.includes(pid)) return;
    patch({ ...task, dependsOn: [...task.dependsOn, pid] });
  }, [patch]);

  const removeDep = useCallback((task: Task, pid: string) => {
    patch({ ...task, dependsOn: task.dependsOn.filter((d) => d !== pid) });
  }, [patch]);

  const importJSON = useCallback((file: File): Promise<void> => new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(String(r.result));
        if (Array.isArray(p) && p.length) { pushHistory(); setTasks(p); }
        else window.alert('El archivo no contiene un tablero válido.');
      } catch { window.alert('No se pudo leer el JSON.'); }
      resolve();
    };
    r.readAsText(file);
  }), [pushHistory]);

  const exportCSV = useCallback(() => {
    const head = ['Módulo', 'Tarea', 'Campaña', 'Inicio', 'Fin', 'Días', 'Responsable', 'Estatus', 'Avance %', 'Detalle'];
    const rows = tasksRef.current.map((t) => [
      t.module, t.name, TRACKS[t.track].label, t.start, t.end, diffDays(parse(t.start), parse(t.end)) + 1,
      t.owner, STATUS[t.status as StatusKey].label, t.progress, (t.detail || '').replace(/\n/g, ' '),
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = 'gantt_marketing_26-27.csv'; a.click();
  }, []);

  const exportJSON = useCallback(() => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(tasksRef.current, null, 2)], { type: 'application/json' }));
    a.download = 'gantt_marketing_26-27.json'; a.click();
  }, []);

  const reset = useCallback(() => {
    if (window.confirm('¿Restablecer el tablero al plan original? Esto reemplaza el tablero compartido para todo el comité.')) {
      pushHistory(); setTasks(buildSeed());
    }
  }, [pushHistory]);

  return {
    tasks, setTasks, tasksRef, sync,
    historySize, pushHistory, discardLast, undo,
    patch, del, addTask, addDep, removeDep, importJSON, exportCSV, exportJSON, reset,
  };
}
