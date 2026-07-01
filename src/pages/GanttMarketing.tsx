import { useEffect, useMemo, useRef, useState } from 'react';
import type { StatusKey, TrackKey, GroupBy, Zoom } from '../features/gantt/types';
import { TRACKS, STATUS, SYNC, LBL } from '../features/gantt/constants';
import { diffDays, parse } from '../features/gantt/dateUtils';
import { useTasks } from '../features/gantt/useTasks';
import { useGanttLayout } from '../features/gantt/useGanttLayout';
import { useDragResize } from '../features/gantt/useDragResize';
import { GanttToolbar } from '../features/gantt/GanttToolbar';
import { GanttRow } from '../features/gantt/GanttRow';
import { GanttArrows } from '../features/gantt/GanttArrows';
import { TaskEditor } from '../features/gantt/TaskEditor';

export default function GanttMarketing() {
  const {
    tasks, setTasks, modules, owners, sync, historySize, pushHistory, discardLast, undo,
    patch, del, addTask, addDep, removeDep, importJSON, exportCSV, exportJSON, reset,
    renameModule, addModule, addOwner,
  } = useTasks();

  const [groupBy, setGroupBy] = useState<GroupBy>('module');
  const [zoom, setZoom] = useState<Zoom>('mes');
  const [query, setQuery] = useState('');
  const [trackF, setTrackF] = useState<Record<TrackKey, boolean>>({ S: true, C: true, T: true });
  const [statusF, setStatusF] = useState<Set<StatusKey>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selId, setSelId] = useState<string | null>(null);
  const [depsOn, setDepsOn] = useState(true);

  const { ppd, timelineW, x, months, groups, layout, arrows, allCollapsed } = useGanttLayout(tasks, {
    groupBy, zoom, query, trackF, statusF, collapsed, depsOn, modules,
  });

  const { startDrag, clickBar, onBarKeyDown } = useDragResize({ setTasks, pushHistory, discardLast });

  const kpi = useMemo(() => {
    const total = tasks.filter((t) => !t.milestone).length;
    const doing = tasks.filter((t) => t.status === 'doing').length;
    const hitos = tasks.filter((t) => t.milestone).length;
    let wsum = 0, wden = 0;
    tasks.forEach((t) => { if (t.milestone) return; const d = diffDays(parse(t.start), parse(t.end)) + 1; wsum += t.progress * d; wden += d; });
    return { total, doing, hitos, avance: wden ? Math.round(wsum / wden) : 0 };
  }, [tasks]);

  // Recorta el SVG de flechas por la izquierda según el scroll, para que las líneas
  // nunca se dibujen por detrás de la columna sticky de títulos.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const arrowsRef = useRef<SVGSVGElement | null>(null);
  const applyArrowClip = () => {
    const sl = scrollRef.current ? scrollRef.current.scrollLeft : 0;
    if (arrowsRef.current) arrowsRef.current.style.clipPath = `inset(0 0 0 ${sl}px)`;
  };
  useEffect(() => { applyArrowClip(); });

  const toggleCat = (k: string) => setCollapsed((p) => {
    const s = new Set(p); if (s.has(k)) s.delete(k); else s.add(k); return s;
  });
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)));
  const toggleStatus = (k: StatusKey) => setStatusF((p) => {
    const s = new Set(p); if (s.has(k)) s.delete(k); else s.add(k); return s;
  });
  const toggleTrack = (t: TrackKey) => setTrackF((p) => ({ ...p, [t]: !p[t] }));
  const handleAddTask = () => setSelId(addTask());

  const sel = tasks.find((t) => t.id === selId) ?? null;
  const rowH = 30;

  return (
    <div>
      <div className="g-titlebar">
        <h1>Gantt de gestión · marketing 26-27</h1>
        <span className="g-sync" style={{ color: SYNC[sync].hex, borderColor: SYNC[sync].hex + '55' }}>
          <span className="g-sync-dot" style={{ background: SYNC[sync].hex }} />{SYNC[sync].label}
        </span>
      </div>
      <div className="sub">Tablero editable y <b>compartido</b> con el comité. <b>Arrastra el centro</b> de una barra para
        reprogramar, <b>los bordes</b> para cambiar la duración, y haz <b>clic</b> para editar. Con foco en una barra:
        flechas para mover, Mayús+flechas para cambiar duración, Enter para editar. Ctrl/⌘+Z deshace.</div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <div className="kpi"><div className="v">{kpi.total}</div><div className="l">Acciones</div></div>
        <div className="kpi"><div className="v" style={{ color: STATUS.doing.hex }}>{kpi.doing}</div><div className="l">En curso</div></div>
        <div className="kpi good"><div className="v">{kpi.avance}%</div><div className="l">Avance ponderado</div>
          <div className="kmeter"><span style={{ width: kpi.avance + '%' }} /></div></div>
        <div className="kpi"><div className="v" style={{ color: '#7A4A86' }}>{kpi.hitos}</div><div className="l">Hitos</div></div>
      </div>

      <GanttToolbar
        query={query} onQuery={setQuery}
        groupBy={groupBy} onGroupBy={setGroupBy}
        zoom={zoom} onZoom={setZoom}
        trackF={trackF} onToggleTrack={toggleTrack}
        depsOn={depsOn} onToggleDeps={() => setDepsOn((v) => !v)}
        allCollapsed={allCollapsed} onToggleAll={toggleAll}
        onAddTask={handleAddTask}
        canUndo={historySize > 0} onUndo={undo}
        onExportCSV={exportCSV} onExportJSON={exportJSON}
        onImportFile={(f) => { importJSON(f); }}
        onReset={reset}
        statusF={statusF} onToggleStatus={toggleStatus}
      />

      <div className="chartbox" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="g-scroll" ref={scrollRef} onScroll={applyArrowClip}>
          <div className="g-inner" style={{ width: LBL + timelineW }}>
            <div className="g-head" style={{ height: 40 }}>
              <div className="g-cell-lbl" style={{ width: LBL }}>Tarea</div>
              <div className="g-timeline" style={{ width: timelineW }}>
                {months.map((mo, i) => (
                  <div key={i} className="g-month" style={{ left: x(mo.ms), width: mo.days * ppd }}>
                    <span>{mo.label}{mo.label === 'ene' || i === 0 ? ` '${String(mo.year).slice(2)}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            {depsOn && <GanttArrows ref={arrowsRef} arrows={arrows} width={timelineW} height={layout.height} left={LBL} />}

            {groups.map((g) => {
              const col = collapsed.has(g.key);
              return (
                <div key={g.key}>
                  <div className="g-group" onClick={() => toggleCat(g.key)}>
                    <div className="g-cell-lbl g-group-lbl" style={{ width: LBL }}>
                      {g.label}<span className="g-count">({g.items.length})</span>
                    </div>
                    <div className="g-timeline" style={{ width: timelineW }} />
                  </div>
                  {!col && g.items.map((t) => {
                    const s = parse(t.start), e = parse(t.end);
                    const left = x(s), w = Math.max((diffDays(s, e) + 1) * ppd, 8);
                    return (
                      <GanttRow key={t.id} task={t} left={left} width={w} timelineW={timelineW} labelWidth={LBL}
                        rowH={rowH} ppd={ppd} selected={selId === t.id} onOpen={setSelId}
                        startDrag={startDrag} clickBar={clickBar} onBarKeyDown={onBarKeyDown} />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="g-legend">
        {(Object.entries(TRACKS) as [TrackKey, typeof TRACKS[TrackKey]][]).map(([k, v]) => (
          <span key={k}><span className="g-dot" style={{ background: v.hex }} />{v.label}</span>
        ))}
        <span className="g-legend-hint">Tono translúcido = pendiente · relleno sólido = avance · ◆ hito · → dependencia · <b style={{ color: '#BE1409' }}>rojo punteado = conflicto de fechas</b></span>
      </div>

      {sel && (
        <TaskEditor key={sel.id} task={sel} tasks={tasks} modules={modules} owners={owners} onPatch={patch} onClose={() => setSelId(null)}
          onDelete={(id) => { del(id); setSelId(null); }} onAddDep={addDep} onRemoveDep={removeDep}
          onRenameModule={renameModule} onAddModule={addModule} onAddOwner={addOwner} />
      )}
    </div>
  );
}
