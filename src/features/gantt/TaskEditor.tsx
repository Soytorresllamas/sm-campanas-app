import { useState } from 'react';
import type { Task, StatusKey, TrackKey } from './types';
import { TRACKS, STATUS } from './constants';

interface Props {
  task: Task;
  tasks: Task[];
  modules: string[];
  owners: string[];
  onPatch: (t: Task) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onAddDep: (task: Task, pid: string) => void;
  onRemoveDep: (task: Task, pid: string) => void;
  onRenameModule: (oldName: string, newName: string) => void;
  onAddModule: (name: string) => string;
  onAddOwner: (name: string) => string;
}

const NEW = '__new__';

export function TaskEditor({
  task: sel, tasks, modules, owners, onPatch, onClose, onDelete, onAddDep, onRemoveDep,
  onRenameModule, onAddModule, onAddOwner,
}: Props) {
  const [moduleMode, setModuleMode] = useState<'select' | 'add' | 'rename'>('select');
  const [moduleDraft, setModuleDraft] = useState('');
  const [ownerMode, setOwnerMode] = useState<'select' | 'add'>('select');
  const [ownerDraft, setOwnerDraft] = useState('');

  const startAddModule = () => { setModuleDraft(''); setModuleMode('add'); };
  const startRenameModule = () => { setModuleDraft(sel.module); setModuleMode('rename'); };
  const cancelModule = () => setModuleMode('select');
  const confirmModule = () => {
    if (moduleMode === 'add') {
      const name = onAddModule(moduleDraft);
      if (name) onPatch({ ...sel, module: name });
    } else if (moduleMode === 'rename') {
      onRenameModule(sel.module, moduleDraft);
    }
    setModuleMode('select');
  };

  const startAddOwner = () => { setOwnerDraft(''); setOwnerMode('add'); };
  const cancelOwner = () => setOwnerMode('select');
  const confirmOwner = () => {
    const name = onAddOwner(ownerDraft);
    if (name) onPatch({ ...sel, owner: name });
    setOwnerMode('select');
  };

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

        <div className="g-fld">
          <span className="g-fld-label-row">Módulo
            {moduleMode === 'select' && <button type="button" className="g-linkbtn" onClick={startRenameModule}>✎ renombrar</button>}
          </span>
          {moduleMode === 'select' ? (
            <select value={sel.module} onChange={(e) => (e.target.value === NEW ? startAddModule() : onPatch({ ...sel, module: e.target.value }))}>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
              <option value={NEW}>+ Nuevo módulo…</option>
            </select>
          ) : (
            <div className="g-inline-add">
              <input autoFocus value={moduleDraft} placeholder={moduleMode === 'add' ? 'Nombre del nuevo módulo' : 'Nuevo nombre del módulo'}
                onChange={(e) => setModuleDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmModule(); if (e.key === 'Escape') cancelModule(); }} />
              <button type="button" className="sec" onClick={confirmModule}>{moduleMode === 'add' ? 'Agregar' : 'Guardar'}</button>
              <button type="button" className="sec" onClick={cancelModule}>Cancelar</button>
            </div>
          )}
          {moduleMode === 'rename' && (
            <div className="hint">Renombra el módulo para todas las acciones que lo usan, no solo esta.</div>
          )}
        </div>

        <div className="g-fld-row">
          <label className="g-fld">Campaña
            <select value={sel.track} onChange={(e) => onPatch({ ...sel, track: e.target.value as TrackKey })}>
              {(Object.entries(TRACKS) as [TrackKey, typeof TRACKS[TrackKey]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></label>
          <div className="g-fld">
            <span className="g-fld-label-row">Responsable</span>
            {ownerMode === 'select' ? (
              <select value={sel.owner} onChange={(e) => (e.target.value === NEW ? startAddOwner() : onPatch({ ...sel, owner: e.target.value }))}>
                {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                <option value={NEW}>+ Nuevo responsable…</option>
              </select>
            ) : (
              <div className="g-inline-add">
                <input autoFocus value={ownerDraft} placeholder="Nombre del responsable"
                  onChange={(e) => setOwnerDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmOwner(); if (e.key === 'Escape') cancelOwner(); }} />
                <button type="button" className="sec" onClick={confirmOwner}>Agregar</button>
                <button type="button" className="sec" onClick={cancelOwner}>Cancelar</button>
              </div>
            )}
          </div>
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
