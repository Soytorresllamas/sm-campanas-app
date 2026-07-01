import type { Task } from './types';
import { TRACKS, STATUS, BAR_H } from './constants';
import { fmtShort, diffDays, parse } from './dateUtils';

interface Props {
  task: Task;
  left: number;
  width: number;
  timelineW: number;
  labelWidth: number;
  rowH: number;
  ppd: number;
  selected: boolean;
  onOpen: (id: string) => void;
  startDrag: (e: React.PointerEvent, task: Task, mode: 'move' | 'l' | 'r', ppd: number) => void;
  clickBar: (id: string, onOpen: (id: string) => void) => void;
  onBarKeyDown: (e: React.KeyboardEvent, task: Task, onOpen: (id: string) => void) => void;
}

export function GanttRow({ task: t, left, width: w, timelineW, labelWidth, rowH, ppd, selected, onOpen, startDrag, clickBar, onBarKeyDown }: Props) {
  const s = parse(t.start), e = parse(t.end);
  const tc = TRACKS[t.track].hex;
  const label = `${t.name}, ${fmtShort(s)}${t.milestone ? '' : ` a ${fmtShort(e)}`}, ${t.progress}%. ` +
    (t.milestone ? 'Flechas para mover, Enter para editar.' : 'Flechas para mover, Mayús+flechas para cambiar duración, Enter para editar.');

  return (
    <div className={`g-row ${selected ? 'sel' : ''}`} style={{ height: rowH }}>
      <div className="g-cell-lbl g-row-lbl" style={{ width: labelWidth }} onClick={() => onOpen(t.id)}>
        <span className="g-status-dot" style={{ background: STATUS[t.status].hex }} title={STATUS[t.status].label} />
        <span className="g-row-name" title={t.name}>{t.name}</span>
      </div>
      <div className="g-timeline" style={{ width: timelineW }}>
        {t.milestone ? (
          <div className="g-mile" style={{ left: left - 8, top: (rowH - 16) / 2, borderBottomColor: tc }}
            tabIndex={0} role="button" aria-label={label}
            onPointerDown={(ev) => startDrag(ev, t, 'move', ppd)}
            onClick={() => clickBar(t.id, onOpen)}
            onKeyDown={(ev) => onBarKeyDown(ev, t, onOpen)}
            title={`${t.name} · ${fmtShort(s)}`} />
        ) : (
          <div className="g-bar" style={{ left, width: w, top: (rowH - BAR_H) / 2, height: BAR_H, background: tc + '38', opacity: t.soft ? 0.85 : 1 }}
            tabIndex={0} role="button" aria-label={label}
            onPointerDown={(ev) => startDrag(ev, t, 'move', ppd)}
            onClick={() => clickBar(t.id, onOpen)}
            onKeyDown={(ev) => onBarKeyDown(ev, t, onOpen)}
            title={`${t.name}\n${fmtShort(s)} – ${fmtShort(e)} · ${diffDays(s, e) + 1} días\n${t.owner} · ${STATUS[t.status].label} · ${t.progress}%`}>
            <div className="g-fill" style={{ width: t.progress + '%', background: tc }} />
            {w > 42 && <span className="g-pct" style={{ color: t.progress > 55 ? '#fff' : 'var(--ink-2)' }}>{t.progress}%</span>}
            <span className="g-edge l" onPointerDown={(ev) => { ev.stopPropagation(); startDrag(ev, t, 'l', ppd); }} />
            <span className="g-edge r" onPointerDown={(ev) => { ev.stopPropagation(); startDrag(ev, t, 'r', ppd); }} />
          </div>
        )}
      </div>
    </div>
  );
}
