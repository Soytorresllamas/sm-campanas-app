import type { Task, StatusKey, TrackKey } from './types';
import { TRACKS, STATUS, OWNERS, MODULES } from './constants';

interface Props {
  task: Task;
  tasks: Task[];
  onPatch: (t: Task) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onAddDep: (task: Task, pid: string) => void;
  onRemoveDep: (task: Task, pid: string) => void;
}

export function TaskEditor({ task: sel, tasks, onPatch, onClose, onDelete, onAddDep, onRemoveDep }: Props) {
  return (
    <>
      <div className="g-backdrop" onClick={onClose} />
      <aside className="g-drawer">
        <div className="g-drawer-head">
          <span className="g-badge" style={{ background: TRACKS[sel.track].hex }}>{TRACKS[sel.track].label}</span>
          <button className="g-x" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <label className="g-fld">Acción
          <input value={sel.name} onChange={(e) => onPatch({ ...sel, name: e.target.value })} /></label>
        <label className="g-fld">Detalle
          <textarea value={sel.detail} onChange={(e) => onPatch({ ...sel, detail: e.target.value })} placeholder="Racional, notas…" /></label>
        <div className="g-fld-row">
          <label className="g-fld">Módulo
            <select value={sel.module} onChange={(e) => onPatch({ ...sel, module: e.target.value })}>
              {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select></label>
        </div>
        <div className="g-fld-row">
          <label className="g-fld">Campaña
            <select value={sel.track} onChange={(e) => onPatch({ ...sel, track: e.target.value as TrackKey })}>
              {(Object.entries(TRACKS) as [TrackKey, typeof TRACKS[TrackKey]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></label>
          <label className="g-fld">Responsable
            <input value={sel.owner} onChange={(e) => onPatch({ ...sel, owner: e.target.value })} list="g-owners" /></label>
          <datalist id="g-owners">{OWNERS.map((o) => <option key={o} value={o} />)}</datalist>
        </div>
        <div className="g-fld-row">
          <label className="g-fld">Inicio
            <input type="date" value={sel.start} onChange={(e) => onPatch({ ...sel, start: e.target.value, end: sel.milestone ? e.target.value : sel.end })} /></label>
          {!sel.milestone && <label className="g-fld">Fin
            <input type="date" value={sel.end} min={sel.start} onChange={(e) => onPatch({ ...sel, end: e.target.value })} /></label>}
        </div>
        <div className="g-fld-row">
          <label className="g-fld">Estatus
            <select value={sel.status} onChange={(e) => onPatch({ ...sel, status: e.target.value as StatusKey })}>
              {(Object.entries(STATUS) as [StatusKey, typeof STATUS[StatusKey]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></label>
        </div>
        {!sel.milestone && (
          <label className="g-fld">Avance <b>{sel.progress}%</b>
            <input type="range" min="0" max="100" step="5" value={sel.progress}
              onChange={(e) => onPatch({ ...sel, progress: Number(e.target.value) })} /></label>
        )}
        <label className="g-fld-check">
          <input type="checkbox" checked={sel.milestone} onChange={(e) => onPatch({ ...sel, milestone: e.target.checked, end: e.target.checked ? sel.start : sel.end })} />
          Es un hito (fecha única)
        </label>
        <div className="g-fld">Depende de (predecesoras)
          {sel.dependsOn.length > 0 && (
            <div className="g-deps">
              {sel.dependsOn.map((pid) => {
                const p = tasks.find((t) => t.id === pid);
                return <span key={pid} className="g-depchip">{p ? p.name : 'tarea eliminada'}
                  <button onClick={() => onRemoveDep(sel, pid)} aria-label="Quitar">✕</button></span>;
              })}
            </div>
          )}
          <select value="" onChange={(e) => { onAddDep(sel, e.target.value); e.target.value = ''; }}>
            <option value="">+ Añadir predecesora…</option>
            {tasks.filter((t) => t.id !== sel.id && !sel.dependsOn.includes(t.id))
              .map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button className="g-del" onClick={() => onDelete(sel.id)}>Eliminar acción</button>
      </aside>
    </>
  );
}
