import { useCallback, useMemo } from 'react';
import type { Task, GanttGroup, ArrowGeom, TrackKey, StatusKey, GroupBy, Zoom } from './types';
import { TRACKS, MODULES, PPD, HEAD_H, GROUP_H, ROW_H } from './constants';
import { MS, MES, diffDays, parse } from './dateUtils';

export interface GanttMonth { ms: number; days: number; label: string; year: number }
interface BarGeom { sx: number; ex: number; cy: number; s: number; e: number }

export interface GanttFilters {
  groupBy: GroupBy;
  zoom: Zoom;
  query: string;
  trackF: Record<TrackKey, boolean>;
  statusF: Set<StatusKey>;
  collapsed: Set<string>;
  depsOn: boolean;
}

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function useGanttLayout(tasks: Task[], f: GanttFilters) {
  const ppd = PPD[f.zoom];

  const domain = useMemo(() => {
    let min = Infinity, max = -Infinity;
    tasks.forEach((t) => { min = Math.min(min, parse(t.start)); max = Math.max(max, parse(t.end)); });
    if (!isFinite(min)) { min = Date.UTC(2026, 8, 1); max = Date.UTC(2027, 9, 31); }
    const s = new Date(min), e = new Date(max);
    const start = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1);
    const end = Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 0);
    return { start, end, days: diffDays(start, end) + 1 };
  }, [tasks]);

  const timelineW = domain.days * ppd;
  const x = useCallback((ms: number) => diffDays(domain.start, ms) * ppd, [domain.start, ppd]);

  const months = useMemo((): GanttMonth[] => {
    const out: GanttMonth[] = [];
    let y = new Date(domain.start).getUTCFullYear(), m = new Date(domain.start).getUTCMonth();
    let cur = Date.UTC(y, m, 1);
    while (cur <= domain.end) {
      const next = Date.UTC(y, m + 1, 1);
      const days = diffDays(cur, Math.min(next - MS, domain.end)) + 1;
      out.push({ ms: cur, days, label: MES[m], year: y });
      m++; if (m > 11) { m = 0; y++; } cur = Date.UTC(y, m, 1);
    }
    return out;
  }, [domain.start, domain.end]);

  const q = norm(f.query);
  const visible = useMemo(() => tasks.filter((t) => {
    if (!f.trackF[t.track]) return false;
    if (f.statusF.size && !f.statusF.has(t.status)) return false;
    if (q && !(norm(t.name).includes(q) || norm(t.detail).includes(q) || norm(t.owner).includes(q))) return false;
    return true;
  }), [tasks, f.trackF, f.statusF, q]);

  const groups = useMemo((): GanttGroup[] => {
    const keys = f.groupBy === 'module' ? MODULES : (['S', 'C', 'T'] as TrackKey[]);
    return keys.map((k) => {
      const items = visible.filter((t) => (f.groupBy === 'module' ? t.module : t.track) === k)
        .sort((a, b) => parse(a.start) - parse(b.start));
      if (!items.length) return null;
      const label = f.groupBy === 'module' ? k : TRACKS[k as TrackKey].label;
      const color = f.groupBy === 'module' ? '#3C4049' : TRACKS[k as TrackKey].hex;
      return { key: k, label, color, items };
    }).filter((g): g is GanttGroup => g !== null);
  }, [visible, f.groupBy]);

  // geometría de cada barra visible, para trazar las flechas de dependencia
  const layout = useMemo(() => {
    const map: Record<string, BarGeom> = {};
    let y = HEAD_H;
    groups.forEach((g) => {
      y += GROUP_H;
      if (f.collapsed.has(g.key)) return;
      g.items.forEach((t) => {
        const s = parse(t.start), e = parse(t.end), cy = y + ROW_H / 2;
        if (t.milestone) { const mx = x(s); map[t.id] = { sx: mx - 8, ex: mx + 8, cy, s, e }; }
        else { const left = x(s), w = Math.max((diffDays(s, e) + 1) * ppd, 8); map[t.id] = { sx: left, ex: left + w, cy, s, e }; }
        y += ROW_H;
      });
    });
    return { map, height: y };
  }, [groups, f.collapsed, x, ppd]);

  const arrows = useMemo((): ArrowGeom[] => {
    if (!f.depsOn) return [];
    const out: ArrowGeom[] = [];
    groups.forEach((g) => {
      if (f.collapsed.has(g.key)) return;
      g.items.forEach((t) => {
        const b = layout.map[t.id]; if (!b) return;
        t.dependsOn.forEach((pid) => {
          const a = layout.map[pid]; if (!a) return;
          out.push({ key: pid + '>' + t.id, x1: a.ex, y1: a.cy, x2: b.sx, y2: b.cy, conflict: b.s < a.s });
        });
      });
    });
    return out;
  }, [f.depsOn, groups, f.collapsed, layout]);

  const allCollapsed = groups.length > 0 && groups.every((g) => f.collapsed.has(g.key));

  return { ppd, domain, timelineW, x, months, visible, groups, layout, arrows, allCollapsed };
}
