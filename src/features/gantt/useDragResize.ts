import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Task, DragMode } from './types';
import { MS, parse, toISO } from './dateUtils';

interface DragState { id: string; mode: DragMode; startX: number; s: number; e: number; ppd: number }

interface Options {
  setTasks: Dispatch<SetStateAction<Task[]>>;
  pushHistory: () => void;
  discardLast: () => void;
}

/**
 * Arrastre con mouse/touch (Pointer Events) + navegación equivalente por teclado:
 * con foco en una barra, ←/→ mueve el rango completo 1 día, Shift+←/→ cambia la
 * duración (mueve solo el fin), Enter/Espacio abre el editor.
 */
export function useDragResize({ setTasks, pushHistory, discardLast }: Options) {
  const drag = useRef<DragState | null>(null);
  const moved = useRef(false);

  const applyDelta = useCallback((id: string, mode: DragMode, s: number, e: number, deltaMs: number) => {
    setTasks((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      if (mode === 'move') return { ...t, start: toISO(s + deltaMs), end: toISO(e + deltaMs) };
      if (mode === 'l') return { ...t, start: toISO(Math.min(s + deltaMs, e)) };
      return { ...t, end: toISO(Math.max(e + deltaMs, s)) };
    }));
  }, [setTasks]);

  // Par de listeners con identidad estable (mismo objeto durante toda la vida del hook),
  // para que window.removeEventListener() enganche exactamente lo que addEventListener()
  // registró. Se guardan en un ref en vez de referenciarse entre sí para evitar el ciclo
  // "usado antes de declararse" que tendría un par de useCallback que se citan mutuamente.
  const handlers = useRef({
    move: (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const dd = Math.round((e.clientX - d.startX) / d.ppd);
      if (dd !== 0) moved.current = true;
      applyDelta(d.id, d.mode, d.s, d.e, dd * MS);
    },
    up: () => {
      if (!moved.current) discardLast(); // fue un clic sin mover: no cuenta como paso de historial
      drag.current = null;
      window.removeEventListener('pointermove', handlers.current.move);
      window.removeEventListener('pointerup', handlers.current.up);
      document.body.classList.remove('g-dragging');
    },
  });

  const startDrag = (e: React.PointerEvent, task: Task, mode: DragMode, ppd: number) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    moved.current = false; pushHistory();
    drag.current = { id: task.id, mode, startX: e.clientX, s: parse(task.start), e: parse(task.end), ppd };
    window.addEventListener('pointermove', handlers.current.move);
    window.addEventListener('pointerup', handlers.current.up);
    document.body.classList.add('g-dragging');
  };

  const clickBar = (id: string, onOpen: (id: string) => void) => {
    if (moved.current) { moved.current = false; return; }
    onOpen(id);
  };

  /** Navegación por teclado: 'move' (←/→) o 'resize-end' (Shift+←/→), ±1 día por pulsación. */
  const nudge = useCallback((task: Task, deltaDays: number, mode: 'move' | 'resize-end') => {
    pushHistory();
    const s = parse(task.start), e = parse(task.end);
    applyDelta(task.id, mode === 'move' ? 'move' : 'r', s, e, deltaDays * MS);
  }, [applyDelta, pushHistory]);

  const onBarKeyDown = (e: React.KeyboardEvent, task: Task, onOpen: (id: string) => void) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(task.id); return; }
    if (task.milestone) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(task, -1, 'move'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(task, 1, 'move'); }
      return;
    }
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(task, -1, e.shiftKey ? 'resize-end' : 'move'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudge(task, 1, e.shiftKey ? 'resize-end' : 'move'); }
  };

  return { startDrag, clickBar, onBarKeyDown, moved };
}
