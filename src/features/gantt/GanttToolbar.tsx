import type { TrackKey, StatusKey, GroupBy, Zoom } from './types';
import { TRACKS, STATUS } from './constants';

interface Props {
  query: string; onQuery: (v: string) => void;
  groupBy: GroupBy; onGroupBy: (v: GroupBy) => void;
  zoom: Zoom; onZoom: (v: Zoom) => void;
  trackF: Record<TrackKey, boolean>; onToggleTrack: (t: TrackKey) => void;
  depsOn: boolean; onToggleDeps: () => void;
  allCollapsed: boolean; onToggleAll: () => void;
  onAddTask: () => void;
  canUndo: boolean; onUndo: () => void;
  onExportCSV: () => void; onExportJSON: () => void;
  onImportFile: (f: File) => void;
  onReset: () => void;
  statusF: Set<StatusKey>; onToggleStatus: (s: StatusKey) => void;
}

const ZOOM_LABEL: Record<Zoom, string> = { trimestre: 'Trim.', mes: 'Mes', semana: 'Sem.' };

export function GanttToolbar(p: Props) {
  return (
    <>
      <div className="g-toolbar">
        <input className="g-search" value={p.query} onChange={(e) => p.onQuery(e.target.value)} placeholder="Buscar acción, responsable…" />
        <div className="g-seg">
          <button className={p.groupBy === 'module' ? 'on' : ''} onClick={() => p.onGroupBy('module')}>Por módulo</button>
          <button className={p.groupBy === 'track' ? 'on' : ''} onClick={() => p.onGroupBy('track')}>Por campaña</button>
        </div>
        <div className="g-seg">
          {(['trimestre', 'mes', 'semana'] as Zoom[]).map((z) => (
            <button key={z} className={p.zoom === z ? 'on' : ''} onClick={() => p.onZoom(z)}>{ZOOM_LABEL[z]}</button>
          ))}
        </div>
        {(['S', 'C', 'T'] as TrackKey[]).map((t) => (
          <label key={t} className="g-chk" style={{ borderColor: p.trackF[t] ? TRACKS[t].hex : 'var(--line-2)' }}>
            <input type="checkbox" checked={p.trackF[t]} onChange={() => p.onToggleTrack(t)} />
            <span className="g-dot" style={{ background: TRACKS[t].hex }} />{TRACKS[t].label}
          </label>
        ))}
        <label className="g-chk" style={{ borderColor: p.depsOn ? '#8C92A0' : 'var(--line-2)' }}>
          <input type="checkbox" checked={p.depsOn} onChange={p.onToggleDeps} />↳ Dependencias
        </label>
        <button className="sec" onClick={p.onToggleAll}>{p.allCollapsed ? 'Expandir todo' : 'Colapsar todo'}</button>
        <button className="sec" onClick={p.onAddTask}>+ Acción</button>
        <button className="sec" onClick={p.onUndo} disabled={!p.canUndo} title="Deshacer (Ctrl/⌘+Z)">↶ Deshacer</button>
        <button className="sec" onClick={p.onExportCSV}>CSV</button>
        <button className="sec" onClick={p.onExportJSON}>JSON</button>
        <label className="sec g-import">Importar
          <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onImportFile(f); e.target.value = ''; }} />
        </label>
        <button className="sec" onClick={p.onReset}>Restablecer</button>
      </div>

      <div className="g-statusfilter">
        <span className="g-sf-label">Estatus:</span>
        {(Object.entries(STATUS) as [StatusKey, typeof STATUS[StatusKey]][]).map(([k, v]) => (
          <button key={k} className={`g-pill ${p.statusF.has(k) ? 'on' : ''}`} onClick={() => p.onToggleStatus(k)}
            style={p.statusF.has(k) ? { background: v.hex, borderColor: v.hex, color: '#fff' } : { borderColor: 'var(--line-2)' }}>
            <span className="g-dot" style={{ background: v.hex }} />{v.label}
          </button>
        ))}
      </div>
    </>
  );
}
