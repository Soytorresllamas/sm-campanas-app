import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { loadLocal, saveLocal, loadRemote, saveRemote } from '../lib/ganttStore.js'

/* ---------- dominio ---------- */
const MS = 86400000
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const toISO = (ms) => new Date(ms).toISOString().slice(0, 10)
const diffDays = (a, b) => Math.round((b - a) / MS)
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fmtShort = (ms) => { const d = new Date(ms); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}` }

const TRACKS = { S: { label: 'SMART', hex: '#2563B0' }, C: { label: 'CORE', hex: '#2C8A7B' }, T: { label: 'Transversal', hex: '#8C92A0' } }
const STATUS = {
  todo: { label: 'Por hacer', hex: '#9AA0AB' }, doing: { label: 'En curso', hex: '#2563B0' },
  done: { label: 'Hecho', hex: '#157A38' }, review: { label: 'Revisar', hex: '#B5841C' }, risk: { label: 'En riesgo', hex: '#BE1409' },
}
const OWNERS = ['Marketing', 'Comercial SMART', 'Comercial CORE', 'Inteligencia comercial', 'Dirección']
const MODULES = [
  '0 · Inteligencia y segmentación', 'Assets, mensajes y oferta', '1 · SMART · Activación temprana',
  '2 · SMART · Cierre', '3 · SMART · Upsell didácticas', '4 · CORE · Apertura + gancho',
  '5 · CORE · Nurturing y conversión', '6 · CORE · Reactivación «Sin actividad»',
  '7 · Medición y cierre auditado', '8 · Always-on: contenido y retención',
]

/* ---------- semilla: plan convertido a fechas reales (Sep 2026 = índice 0) ---------- */
const BASE_Y = 2026, BASE_M = 8
const monStart = (i) => toISO(Date.UTC(BASE_Y, BASE_M + i, 1))
const monEnd = (i) => toISO(Date.UTC(BASE_Y, BASE_M + i + 1, 0))
const ownerFor = (track) => track === 'S' ? 'Comercial SMART' : track === 'C' ? 'Comercial CORE' : 'Marketing'

// [módulo, tarea, mesIni, mesFin, track, soft]
const PLAN = [
  ['0 · Inteligencia y segmentación', 'Limpieza y unificación del CSV nominal', 0, 0, 'T', false],
  ['0 · Inteligencia y segmentación', 'Scoring de propensión por colegio', 0, 1, 'T', false],
  ['0 · Inteligencia y segmentación', 'ICP y persona de compra por bloque', 1, 1, 'T', false],
  ['0 · Inteligencia y segmentación', 'Lista 1,302 «Sin actividad» con competencia', 1, 2, 'T', false],
  ['0 · Inteligencia y segmentación', 'Tablero de segmentos y asignación a comercial', 2, 2, 'T', false],
  ['Assets, mensajes y oferta', 'Arquitectura de mensajes por etapa', 1, 1, 'T', true],
  ['Assets, mensajes y oferta', 'Kit de demo de uso (asesor pedagógico)', 1, 2, 'T', true],
  ['Assets, mensajes y oferta', 'Empaquetado y pricing de didácticas específicas', 2, 2, 'T', true],
  ['Assets, mensajes y oferta', 'Landing pages y creatividad por bloque', 2, 3, 'T', true],
  ['Assets, mensajes y oferta', 'Secuencias de email y automatización', 3, 3, 'T', true],
  ['1 · SMART · Activación temprana', 'ABM 1:1 a cuentas de alto valor', 3, 4, 'S', false],
  ['1 · SMART · Activación temprana', 'Demos de uso con asesor pedagógico', 3, 4, 'S', false],
  ['1 · SMART · Activación temprana', 'Incentivo early-bird por decisión temprana', 3, 3, 'S', false],
  ['1 · SMART · Activación temprana', 'Webinar de apertura de ciclo (directores)', 3, 3, 'S', false],
  ['2 · SMART · Cierre', 'Conversión con casos y prueba social', 5, 6, 'S', false],
  ['2 · SMART · Cierre', 'Facilitación de decisión y cotización', 6, 7, 'S', false],
  ['2 · SMART · Cierre', 'Renovación y retención de la base (94%)', 5, 7, 'S', false],
  ['2 · SMART · Cierre', 'Sprint final tope feb', 7, 7, 'S', false],
  ['3 · SMART · Upsell didácticas', 'Cross-sell de didácticas a base cerrada', 8, 11, 'S', true],
  ['3 · SMART · Upsell didácticas', 'Co-venta con especialistas externos', 8, 10, 'S', true],
  ['3 · SMART · Upsell didácticas', 'Bundle uso + profundización + didáctica', 9, 9, 'S', true],
  ['3 · SMART · Upsell didácticas', 'Casos de éxito para referidos', 10, 11, 'S', true],
  ['4 · CORE · Apertura + gancho', 'Awareness multicanal amplio', 6, 8, 'C', false],
  ['4 · CORE · Apertura + gancho', 'Didácticas específicas como puerta de entrada', 6, 7, 'C', false],
  ['4 · CORE · Apertura + gancho', 'Lead-gen: webinars y contenido descargable', 6, 8, 'C', false],
  ['4 · CORE · Apertura + gancho', 'Retargeting a interesados', 7, 8, 'C', false],
  ['5 · CORE · Nurturing y conversión', 'Secuencias de nurturing por score', 9, 12, 'C', false],
  ['5 · CORE · Nurturing y conversión', 'ABM a cuentas valor / en competencia', 9, 11, 'C', false],
  ['5 · CORE · Nurturing y conversión', 'Cierre de contrato de didácticas', 10, 12, 'C', false],
  ['5 · CORE · Nurturing y conversión', 'Pilotos y demostraciones de taller', 9, 10, 'C', false],
  ['6 · CORE · Reactivación «Sin actividad»', 'Creación de demanda (sin opp abierta)', 7, 12, 'C', true],
  ['6 · CORE · Reactivación «Sin actividad»', 'Oferta de desplazamiento a los 1,302', 8, 11, 'C', true],
  ['6 · CORE · Reactivación «Sin actividad»', 'Diagnóstico pedagógico gratuito (gancho)', 7, 9, 'C', true],
  ['6 · CORE · Reactivación «Sin actividad»', 'Eventos regionales y ferias', 9, 10, 'C', true],
  ['7 · Medición y cierre auditado', 'Atribución por bloque y campaña', 12, 12, 'T', false],
  ['7 · Medición y cierre auditado', 'Dashboard de KPIs vs metas', 12, 13, 'T', false],
  ['7 · Medición y cierre auditado', 'Lecciones y recalibración de tasas', 13, 13, 'T', false],
  ['7 · Medición y cierre auditado', 'Brief de planeación 27-28', 13, 13, 'T', false],
  ['8 · Always-on: contenido y retención', 'Newsletter docente mensual', 3, 14, 'T', true],
  ['8 · Always-on: contenido y retención', 'Biblioteca de casos de éxito', 3, 14, 'T', true],
  ['8 · Always-on: contenido y retención', 'Comunidad docente y webinars recurrentes', 4, 14, 'T', true],
  ['8 · Always-on: contenido y retención', 'Social orgánico y SEO', 3, 14, 'T', true],
]
// Estatus/avance realistas de pre-lanzamiento (jul 2026, arranque en sep). Editable.
const SEEDSTATE = {
  'Limpieza y unificación del CSV nominal': { status: 'doing', progress: 45 },
  'Scoring de propensión por colegio': { status: 'doing', progress: 20 },
  'ICP y persona de compra por bloque': { status: 'doing', progress: 10 },
  'Arquitectura de mensajes por etapa': { status: 'doing', progress: 25 },
  'Kit de demo de uso (asesor pedagógico)': { status: 'doing', progress: 10 },
}
// Dependencias sembradas (tarea → predecesoras por nombre). 100% editables en la herramienta.
const DEPS = {
  'Scoring de propensión por colegio': ['Limpieza y unificación del CSV nominal'],
  'ICP y persona de compra por bloque': ['Scoring de propensión por colegio'],
  'Lista 1,302 «Sin actividad» con competencia': ['Scoring de propensión por colegio'],
  'Tablero de segmentos y asignación a comercial': ['ICP y persona de compra por bloque', 'Lista 1,302 «Sin actividad» con competencia'],
  'ABM 1:1 a cuentas de alto valor': ['Tablero de segmentos y asignación a comercial', 'Arquitectura de mensajes por etapa'],
  'Conversión con casos y prueba social': ['ABM 1:1 a cuentas de alto valor'],
  'Facilitación de decisión y cotización': ['Conversión con casos y prueba social'],
  'Cross-sell de didácticas a base cerrada': ['Renovación y retención de la base (94%)'],
  'Secuencias de nurturing por score': ['Lead-gen: webinars y contenido descargable'],
  'Cierre de contrato de didácticas': ['Secuencias de nurturing por score'],
  'Dashboard de KPIs vs metas': ['Atribución por bloque y campaña'],
  'Lecciones y recalibración de tasas': ['Dashboard de KPIs vs metas'],
}
const buildSeed = () => {
  const tasks = PLAN.map(([module, name, s, e, track, soft], i) => ({
    id: 't' + i, module, name, detail: '', track, soft,
    start: monStart(s), end: monEnd(e),
    owner: ownerFor(track), status: SEEDSTATE[name]?.status || 'todo',
    progress: SEEDSTATE[name]?.progress || 0, milestone: false, dependsOn: [],
  }))
  const mile = (id, name, module, track, date) => ({ id, name, detail: '', module, track, soft: false, start: date, end: date, owner: 'Dirección', status: 'todo', progress: 0, milestone: true, dependsOn: [] })
  tasks.push(mile('m1', '◆ Convención Comercial (Kick-off)', '1 · SMART · Activación temprana', 'S', '2026-09-08'))
  tasks.push(mile('m2', '◆ Tope SMART (cierre feb)', '2 · SMART · Cierre', 'S', '2027-02-28'))
  tasks.push(mile('m3', '◆ Auditoría de resultados', '7 · Medición y cierre auditado', 'T', '2027-09-15'))
  const idByName = Object.fromEntries(tasks.map((t) => [t.name, t.id]))
  tasks.forEach((t) => { const pre = DEPS[t.name]; if (pre) t.dependsOn = pre.map((n) => idByName[n]).filter(Boolean) })
  return tasks
}

const PPD = { trimestre: 2.4, mes: 5.2, semana: 14 }
const SYNC = {
  loading: { label: 'Cargando…', hex: '#B5841C' }, saving: { label: 'Guardando…', hex: '#B5841C' },
  synced: { label: 'Sincronizado ✓', hex: '#157A38' }, error: { label: 'Sin conexión · local', hex: '#BE1409' },
}

/* ---------- componente ---------- */
export default function GanttMarketing() {
  const [tasks, setTasks] = useState(() => loadLocal() || buildSeed())
  const [groupBy, setGroupBy] = useState('module')
  const [zoom, setZoom] = useState('mes')
  const [query, setQuery] = useState('')
  const [trackF, setTrackF] = useState({ S: true, C: true, T: true })
  const [statusF, setStatusF] = useState(new Set())
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [selId, setSelId] = useState(null)
  const [sync, setSync] = useState('loading')
  const [depsOn, setDepsOn] = useState(true)

  const tasksRef = useRef(tasks); tasksRef.current = tasks
  const ready = useRef(false); const skipSave = useRef(false); const saveTimer = useRef(null)
  const history = useRef([])
  const pushHistory = () => { history.current.push(JSON.stringify(tasksRef.current)); if (history.current.length > 60) history.current.shift() }
  const undo = useCallback(() => { const prev = history.current.pop(); if (prev) setTasks(JSON.parse(prev)) }, [])

  // carga inicial desde Supabase (con lo local ya pintado al instante)
  useEffect(() => {
    let alive = true
    loadRemote().then(async ({ tasks: rt, source, error }) => {
      if (!alive) return
      if (source === 'remote') { skipSave.current = true; setTasks(rt); setSync('synced') }
      else if (error) { setSync('error') }
      else { const { ok } = await saveRemote(tasksRef.current); setSync(ok ? 'synced' : 'error') }
      ready.current = true
    })
    return () => { alive = false }
  }, [])

  // guardado: local inmediato + remoto con debounce
  useEffect(() => {
    saveLocal(tasks)
    if (!ready.current) return
    if (skipSave.current) { skipSave.current = false; return }
    setSync((s) => s === 'error' ? 'error' : 'saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => { const { ok } = await saveRemote(tasksRef.current); setSync(ok ? 'synced' : 'error') }, 700)
    return () => clearTimeout(saveTimer.current)
  }, [tasks])

  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo() } }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  const ppd = PPD[zoom]
  const LBL = 464

  const domain = useMemo(() => {
    let min = Infinity, max = -Infinity
    tasks.forEach((t) => { min = Math.min(min, parse(t.start)); max = Math.max(max, parse(t.end)) })
    if (!isFinite(min)) { min = Date.UTC(2026, 8, 1); max = Date.UTC(2027, 9, 31) }
    const s = new Date(min), e = new Date(max)
    const start = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1)
    const end = Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 0)
    return { start, end, days: diffDays(start, end) + 1 }
  }, [tasks])
  const timelineW = domain.days * ppd
  const x = useCallback((ms) => diffDays(domain.start, ms) * ppd, [domain.start, ppd])

  const months = useMemo(() => {
    const out = []; let y = new Date(domain.start).getUTCFullYear(), m = new Date(domain.start).getUTCMonth()
    let cur = Date.UTC(y, m, 1)
    while (cur <= domain.end) {
      const next = Date.UTC(y, m + 1, 1)
      const days = diffDays(cur, Math.min(next - MS, domain.end)) + 1
      out.push({ ms: cur, days, label: MES[m], year: y }); m++; if (m > 11) { m = 0; y++ }; cur = Date.UTC(y, m, 1)
    }
    return out
  }, [domain.start, domain.end])

  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const q = norm(query)
  const visible = useMemo(() => tasks.filter((t) => {
    if (!trackF[t.track]) return false
    if (statusF.size && !statusF.has(t.status)) return false
    if (q && !(norm(t.name).includes(q) || norm(t.detail).includes(q) || norm(t.owner).includes(q))) return false
    return true
  }), [tasks, trackF, statusF, q])

  const groups = useMemo(() => {
    const keys = groupBy === 'module' ? MODULES : ['S', 'C', 'T']
    return keys.map((k) => {
      const items = visible.filter((t) => (groupBy === 'module' ? t.module : t.track) === k)
        .sort((a, b) => parse(a.start) - parse(b.start))
      if (!items.length) return null
      const label = groupBy === 'module' ? k : TRACKS[k].label
      const color = groupBy === 'module' ? '#3C4049' : TRACKS[k].hex
      return { key: k, label, color, items }
    }).filter(Boolean)
  }, [visible, groupBy])

  const kpi = useMemo(() => {
    const total = tasks.filter((t) => !t.milestone).length
    const doing = tasks.filter((t) => t.status === 'doing').length
    const hitos = tasks.filter((t) => t.milestone).length
    let wsum = 0, wden = 0
    tasks.forEach((t) => { if (t.milestone) return; const d = diffDays(parse(t.start), parse(t.end)) + 1; wsum += t.progress * d; wden += d })
    return { total, doing, hitos, avance: wden ? Math.round(wsum / wden) : 0 }
  }, [tasks])

  const HEAD_H = 40, GROUP_H = 30, ROW_H = 30
  // geometría de cada barra visible, para trazar las flechas de dependencia
  const layout = useMemo(() => {
    const map = {}; let y = HEAD_H
    groups.forEach((g) => {
      y += GROUP_H
      if (collapsed.has(g.key)) return
      g.items.forEach((t) => {
        const s = parse(t.start), e = parse(t.end), cy = y + ROW_H / 2
        if (t.milestone) { const mx = x(s); map[t.id] = { sx: mx - 8, ex: mx + 8, cy, s, e } }
        else { const left = x(s), w = Math.max((diffDays(s, e) + 1) * ppd, 8); map[t.id] = { sx: left, ex: left + w, cy, s, e } }
        y += ROW_H
      })
    })
    return { map, height: y }
  }, [groups, collapsed, x, ppd])

  const arrows = useMemo(() => {
    if (!depsOn) return []
    const out = []
    groups.forEach((g) => { if (collapsed.has(g.key)) return; g.items.forEach((t) => {
      const b = layout.map[t.id]; if (!b || !Array.isArray(t.dependsOn)) return
      t.dependsOn.forEach((pid) => {
        const a = layout.map[pid]; if (!a) return
        out.push({ key: pid + '>' + t.id, x1: a.ex, y1: a.cy, x2: b.sx, y2: b.cy, conflict: b.s < a.s })
      })
    }) })
    return out
  }, [depsOn, groups, collapsed, layout])

  // Recorta el SVG de flechas por la izquierda según el scroll, para que las líneas
  // nunca se dibujen por detrás de la columna sticky de títulos.
  const scrollRef = useRef(null); const arrowsRef = useRef(null)
  const applyArrowClip = () => {
    const sl = scrollRef.current ? scrollRef.current.scrollLeft : 0
    if (arrowsRef.current) arrowsRef.current.style.clipPath = `inset(0 0 0 ${sl}px)`
  }
  useEffect(() => { applyArrowClip() })

  /* ----- drag ----- */
  const drag = useRef(null); const moved = useRef(false)
  const onMove = useCallback((e) => {
    const d = drag.current; if (!d) return
    const dd = Math.round((e.clientX - d.startX) / d.ppd)
    if (dd !== 0) moved.current = true
    setTasks((ts) => ts.map((t) => {
      if (t.id !== d.id) return t
      if (d.mode === 'move') return { ...t, start: toISO(d.s + dd * MS), end: toISO(d.e + dd * MS) }
      if (d.mode === 'l') return { ...t, start: toISO(Math.min(d.s + dd * MS, d.e)) }
      if (d.mode === 'r') return { ...t, end: toISO(Math.max(d.e + dd * MS, d.s)) }
      return t
    }))
  }, [])
  const endDrag = useCallback(() => {
    if (!moved.current) history.current.pop() // descarta el snapshot si fue un clic sin mover
    drag.current = null
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', endDrag)
    document.body.classList.remove('g-dragging')
  }, [onMove])
  const startDrag = (e, t, mode) => {
    if (e.button != null && e.button !== 0) return
    e.preventDefault(); e.stopPropagation(); moved.current = false; pushHistory()
    drag.current = { id: t.id, mode, startX: e.clientX, s: parse(t.start), e: parse(t.end), ppd }
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', endDrag)
    document.body.classList.add('g-dragging')
  }
  const openTask = (id) => { pushHistory(); setSelId(id) }
  const clickBar = (id) => { if (moved.current) { moved.current = false; return } openTask(id) }

  /* ----- mutaciones ----- */
  const patch = (next) => setTasks((ts) => ts.map((t) => t.id === next.id ? next : t))
  const del = (id) => { pushHistory(); setTasks((ts) => ts.filter((t) => t.id !== id).map((t) => Array.isArray(t.dependsOn) && t.dependsOn.includes(id) ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== id) } : t)); setSelId(null) }
  const addTask = () => {
    pushHistory()
    const id = 'u' + Date.now().toString(36)
    const start = Date.UTC(2026, 8, 1)
    const nt = { id, module: MODULES[0], name: 'Nueva acción', detail: '', track: 'T', soft: false, start: toISO(start), end: toISO(start + 20 * MS), owner: OWNERS[0], status: 'todo', progress: 0, milestone: false, dependsOn: [] }
    setTasks((ts) => [...ts, nt]); setSelId(id)
  }
  // dependencias en el editor: evita self y ciclo directo (que la predecesora ya dependa de esta)
  const addDep = (task, pid) => {
    if (!pid || pid === task.id) return
    const pred = tasksRef.current.find((t) => t.id === pid)
    if (pred && Array.isArray(pred.dependsOn) && pred.dependsOn.includes(task.id)) { window.alert('Eso crearía una dependencia circular.'); return }
    const cur = Array.isArray(task.dependsOn) ? task.dependsOn : []
    if (cur.includes(pid)) return
    patch({ ...task, dependsOn: [...cur, pid] })
  }
  const removeDep = (task, pid) => patch({ ...task, dependsOn: (task.dependsOn || []).filter((d) => d !== pid) })
  const importJSON = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => { try { const p = JSON.parse(r.result); if (Array.isArray(p) && p.length) { pushHistory(); setTasks(p) } else window.alert('El archivo no contiene un tablero válido.') } catch (err) { window.alert('No se pudo leer el JSON.') } }
    r.readAsText(f); e.target.value = ''
  }
  const toggleCat = (k) => setCollapsed((p) => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s })
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.key))
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)))
  const toggleStatus = (k) => setStatusF((p) => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s })

  const exportCSV = () => {
    const head = ['Módulo', 'Tarea', 'Campaña', 'Inicio', 'Fin', 'Días', 'Responsable', 'Estatus', 'Avance %', 'Detalle']
    const rows = tasks.map((t) => [t.module, t.name, TRACKS[t.track].label, t.start, t.end, diffDays(parse(t.start), parse(t.end)) + 1,
      t.owner, STATUS[t.status].label, t.progress, (t.detail || '').replace(/\n/g, ' ')])
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    a.download = 'gantt_marketing_26-27.csv'; a.click()
  }
  const exportJSON = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' }))
    a.download = 'gantt_marketing_26-27.json'; a.click()
  }
  const reset = () => { if (window.confirm('¿Restablecer el tablero al plan original? Esto reemplaza el tablero compartido para todo el comité.')) { pushHistory(); setTasks(buildSeed()); setSelId(null) } }

  const sel = tasks.find((t) => t.id === selId)
  const rowH = 30, barH = 17

  return (
    <div>
      <div className="g-titlebar">
        <h1>Gantt de gestión · marketing 26-27</h1>
        <span className="g-sync" style={{ color: SYNC[sync].hex, borderColor: SYNC[sync].hex + '55' }}>
          <span className="g-sync-dot" style={{ background: SYNC[sync].hex }} />{SYNC[sync].label}
        </span>
      </div>
      <div className="sub">Tablero editable y <b>compartido</b> con el comité. <b>Arrastra el centro</b> de una barra para
        reprogramar, <b>los bordes</b> para cambiar la duración, y haz <b>clic</b> para editar. Ctrl/⌘+Z deshace.</div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <div className="kpi"><div className="v">{kpi.total}</div><div className="l">Acciones</div></div>
        <div className="kpi"><div className="v" style={{ color: STATUS.doing.hex }}>{kpi.doing}</div><div className="l">En curso</div></div>
        <div className="kpi good"><div className="v">{kpi.avance}%</div><div className="l">Avance ponderado</div>
          <div className="kmeter"><span style={{ width: kpi.avance + '%' }} /></div></div>
        <div className="kpi"><div className="v" style={{ color: '#7A4A86' }}>{kpi.hitos}</div><div className="l">Hitos</div></div>
      </div>

      <div className="g-toolbar">
        <input className="g-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar acción, responsable…" />
        <div className="g-seg">
          <button className={groupBy === 'module' ? 'on' : ''} onClick={() => setGroupBy('module')}>Por módulo</button>
          <button className={groupBy === 'track' ? 'on' : ''} onClick={() => setGroupBy('track')}>Por campaña</button>
        </div>
        <div className="g-seg">
          {['trimestre', 'mes', 'semana'].map((z) => (
            <button key={z} className={zoom === z ? 'on' : ''} onClick={() => setZoom(z)}>{z === 'trimestre' ? 'Trim.' : z === 'mes' ? 'Mes' : 'Sem.'}</button>
          ))}
        </div>
        {['S', 'C', 'T'].map((t) => (
          <label key={t} className="g-chk" style={{ borderColor: trackF[t] ? TRACKS[t].hex : 'var(--line-2)' }}>
            <input type="checkbox" checked={trackF[t]} onChange={() => setTrackF((p) => ({ ...p, [t]: !p[t] }))} />
            <span className="g-dot" style={{ background: TRACKS[t].hex }} />{TRACKS[t].label}
          </label>
        ))}
        <label className="g-chk" style={{ borderColor: depsOn ? '#8C92A0' : 'var(--line-2)' }}>
          <input type="checkbox" checked={depsOn} onChange={() => setDepsOn((v) => !v)} />↳ Dependencias
        </label>
        <button className="sec" onClick={toggleAll}>{allCollapsed ? 'Expandir todo' : 'Colapsar todo'}</button>
        <button className="sec" onClick={addTask}>+ Acción</button>
        <button className="sec" onClick={undo} disabled={!history.current.length} title="Deshacer (Ctrl/⌘+Z)">↶ Deshacer</button>
        <button className="sec" onClick={exportCSV}>CSV</button>
        <button className="sec" onClick={exportJSON}>JSON</button>
        <label className="sec g-import">Importar<input type="file" accept="application/json,.json" onChange={importJSON} /></label>
        <button className="sec" onClick={reset}>Restablecer</button>
      </div>

      <div className="g-statusfilter">
        <span className="g-sf-label">Estatus:</span>
        {Object.entries(STATUS).map(([k, v]) => (
          <button key={k} className={`g-pill ${statusF.has(k) ? 'on' : ''}`} onClick={() => toggleStatus(k)}
            style={statusF.has(k) ? { background: v.hex, borderColor: v.hex, color: '#fff' } : { borderColor: 'var(--line-2)' }}>
            <span className="g-dot" style={{ background: v.hex }} />{v.label}
          </button>
        ))}
      </div>

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

            {depsOn && arrows.length > 0 && (
              <svg className="g-arrows" ref={arrowsRef} width={timelineW} height={layout.height}
                style={{ position: 'absolute', top: 0, left: LBL, zIndex: 2, pointerEvents: 'none' }}>
                <defs>
                  <marker id="g-ah" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#8C92A0" />
                  </marker>
                  <marker id="g-ah-w" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#BE1409" />
                  </marker>
                </defs>
                {arrows.map((a) => (
                  <path key={a.key} fill="none" markerEnd={`url(#${a.conflict ? 'g-ah-w' : 'g-ah'})`}
                    d={`M ${a.x1} ${a.y1} C ${a.x1 + 16} ${a.y1}, ${a.x2 - 16} ${a.y2}, ${a.x2} ${a.y2}`}
                    stroke={a.conflict ? '#BE1409' : '#8C92A0'} strokeWidth={a.conflict ? 1.6 : 1.3}
                    strokeDasharray={a.conflict ? '4 3' : 'none'} opacity={a.conflict ? 0.95 : 0.65} />
                ))}
              </svg>
            )}
            {groups.map((g) => {
              const col = collapsed.has(g.key)
              return (
                <div key={g.key}>
                  <div className="g-group" onClick={() => toggleCat(g.key)}>
                    <div className="g-cell-lbl g-group-lbl" style={{ width: LBL }}>
                      {g.label}<span className="g-count">({g.items.length})</span>
                    </div>
                    <div className="g-timeline" style={{ width: timelineW }} />
                  </div>
                  {!col && g.items.map((t) => {
                    const s = parse(t.start), e = parse(t.end)
                    const left = x(s), w = Math.max((diffDays(s, e) + 1) * ppd, 8)
                    const tc = TRACKS[t.track].hex
                    return (
                      <div key={t.id} className={`g-row ${selId === t.id ? 'sel' : ''}`} style={{ height: rowH }}>
                        <div className="g-cell-lbl g-row-lbl" style={{ width: LBL }} onClick={() => openTask(t.id)}>
                          <span className="g-status-dot" style={{ background: STATUS[t.status].hex }} title={STATUS[t.status].label} />
                          <span className="g-row-name" title={t.name}>{t.name}</span>
                        </div>
                        <div className="g-timeline" style={{ width: timelineW }}>
                          {t.milestone ? (
                            <div className="g-mile" style={{ left: left - 8, top: (rowH - 16) / 2, borderBottomColor: tc }}
                              onPointerDown={(ev) => startDrag(ev, t, 'move')} onClick={() => clickBar(t.id)}
                              title={`${t.name} · ${fmtShort(s)}`} />
                          ) : (
                            <div className="g-bar" style={{ left, width: w, top: (rowH - barH) / 2, height: barH, background: tc + '38', opacity: t.soft ? 0.85 : 1 }}
                              onPointerDown={(ev) => startDrag(ev, t, 'move')} onClick={() => clickBar(t.id)}
                              title={`${t.name}\n${fmtShort(s)} – ${fmtShort(e)} · ${diffDays(s, e) + 1} días\n${t.owner} · ${STATUS[t.status].label} · ${t.progress}%`}>
                              <div className="g-fill" style={{ width: t.progress + '%', background: tc }} />
                              {w > 42 && <span className="g-pct" style={{ color: t.progress > 55 ? '#fff' : 'var(--ink-2)' }}>{t.progress}%</span>}
                              <span className="g-edge l" onPointerDown={(ev) => startDrag(ev, t, 'l')} />
                              <span className="g-edge r" onPointerDown={(ev) => startDrag(ev, t, 'r')} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="g-legend">
        {Object.entries(TRACKS).map(([k, v]) => (
          <span key={k}><span className="g-dot" style={{ background: v.hex }} />{v.label}</span>
        ))}
        <span className="g-legend-hint">Tono translúcido = pendiente · relleno sólido = avance · ◆ hito · → dependencia · <b style={{ color: '#BE1409' }}>rojo punteado = conflicto de fechas</b></span>
      </div>

      {sel && (
        <>
          <div className="g-backdrop" onClick={() => setSelId(null)} />
          <aside className="g-drawer">
            <div className="g-drawer-head">
              <span className="g-badge" style={{ background: TRACKS[sel.track].hex }}>{TRACKS[sel.track].label}</span>
              <button className="g-x" onClick={() => setSelId(null)} aria-label="Cerrar">✕</button>
            </div>
            <label className="g-fld">Acción
              <input value={sel.name} onChange={(e) => patch({ ...sel, name: e.target.value })} /></label>
            <label className="g-fld">Detalle
              <textarea value={sel.detail} onChange={(e) => patch({ ...sel, detail: e.target.value })} placeholder="Racional, notas…" /></label>
            <div className="g-fld-row">
              <label className="g-fld">Módulo
                <select value={sel.module} onChange={(e) => patch({ ...sel, module: e.target.value })}>
                  {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select></label>
            </div>
            <div className="g-fld-row">
              <label className="g-fld">Campaña
                <select value={sel.track} onChange={(e) => patch({ ...sel, track: e.target.value })}>
                  {Object.entries(TRACKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></label>
              <label className="g-fld">Responsable
                <input value={sel.owner} onChange={(e) => patch({ ...sel, owner: e.target.value })} list="g-owners" /></label>
              <datalist id="g-owners">{OWNERS.map((o) => <option key={o} value={o} />)}</datalist>
            </div>
            <div className="g-fld-row">
              <label className="g-fld">Inicio
                <input type="date" value={sel.start} onChange={(e) => patch({ ...sel, start: e.target.value, end: sel.milestone ? e.target.value : sel.end })} /></label>
              {!sel.milestone && <label className="g-fld">Fin
                <input type="date" value={sel.end} min={sel.start} onChange={(e) => patch({ ...sel, end: e.target.value })} /></label>}
            </div>
            <div className="g-fld-row">
              <label className="g-fld">Estatus
                <select value={sel.status} onChange={(e) => patch({ ...sel, status: e.target.value })}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></label>
            </div>
            {!sel.milestone && (
              <label className="g-fld">Avance <b>{sel.progress}%</b>
                <input type="range" min="0" max="100" step="5" value={sel.progress}
                  onChange={(e) => patch({ ...sel, progress: Number(e.target.value) })} /></label>
            )}
            <label className="g-fld-check">
              <input type="checkbox" checked={sel.milestone} onChange={(e) => patch({ ...sel, milestone: e.target.checked, end: e.target.checked ? sel.start : sel.end })} />
              Es un hito (fecha única)
            </label>
            <div className="g-fld">Depende de (predecesoras)
              {(sel.dependsOn || []).length > 0 && (
                <div className="g-deps">
                  {sel.dependsOn.map((pid) => {
                    const p = tasks.find((t) => t.id === pid)
                    return <span key={pid} className="g-depchip">{p ? p.name : 'tarea eliminada'}
                      <button onClick={() => removeDep(sel, pid)} aria-label="Quitar">✕</button></span>
                  })}
                </div>
              )}
              <select value="" onChange={(e) => { addDep(sel, e.target.value); e.target.value = '' }}>
                <option value="">+ Añadir predecesora…</option>
                {tasks.filter((t) => t.id !== sel.id && !(sel.dependsOn || []).includes(t.id))
                  .map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button className="g-del" onClick={() => del(sel.id)}>Eliminar acción</button>
          </aside>
        </>
      )}
    </div>
  )
}
