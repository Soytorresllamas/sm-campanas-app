import { useMemo, useState } from 'react'

const AX = ["Sep'26","Oct'26","Nov","Dic","Ene'27","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep'27","Oct'27"]
const NAX = 16
const AXI = ["Jun","Jul","Ago","Sep","Oct","Nov","Dic","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep"]
const AXY = ["26","26","26","26","26","26","26","27","27","27","27","27","27","27","27","27"]
const M = ["Jul","Ago","Sep","Oct","Nov","Dic","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep"]
const MY = ["26","26","26","26","26","26","27","27","27","27","27","27","27","27","27"]
const COL = { S: '#E40521', C: '#2C8A7B', T: '#8C92A0' }
const CATS = [
  '0 · Inteligencia y segmentación', 'Assets, mensajes y oferta', '1 · SMART · Activación temprana',
  '2 · SMART · Cierre', '3 · SMART · Upsell didácticas', '4 · CORE · Apertura + gancho',
  '5 · CORE · Nurturing y conversión', '6 · CORE · Reactivación «Sin actividad»',
  '7 · Medición y cierre auditado', '8 · Always-on: contenido y retención',
]
const MILES = [
  { f: (2 + 0.28) / NAX, t: 'Convención 8-10 sep', c: '#7A4A86' },
  { f: 8 / NAX, t: 'tope feb', c: '#B5841C' },
  { f: 14 / NAX, t: 'auditoría', c: '#B5841C' },
]
const TASKS = [
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
].map(([cat, label, s, e, track, soft]) => ({ cat, label, s, e, track, soft }))

export default function GanttMarketing() {
  const [flt, setFlt] = useState({ S: true, C: true, T: true })
  const [weeks, setWeeks] = useState(2)
  const [cozy, setCozy] = useState(false)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const shift = weeks / 4.345
  const LBL = cozy ? 235 : 205
  const rowH = cozy ? 26 : 20, barH = cozy ? 18 : 14, fs = cozy ? 11.5 : 10

  const toggleCat = (ci) => setCollapsed((p) => { const s = new Set(p); s.has(ci) ? s.delete(ci) : s.add(ci); return s })
  const grouped = useMemo(() => CATS.map((cat, ci) => ({
    cat, ci, items: TASKS.filter((t) => t.cat === cat && flt[t.track]),
  })).filter((g) => g.items.length), [flt])

  const gridBg = `repeating-linear-gradient(90deg,transparent 0,transparent calc(100%/${NAX} - 1px),#f0f0f0 calc(100%/${NAX} - 1px),#f0f0f0 calc(100%/${NAX}))`

  return (
    <div>
      <h1>Gantt interactivo de marketing · 26-27</h1>
      <div className="sub">Acciones <b>adelantadas {weeks} semanas</b>; los hitos quedan fijos. Clic en un módulo para abrir/cerrar.</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {['S', 'C', 'T'].map((t) => (
          <label key={t} style={{ fontSize: 12, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <input type="checkbox" checked={flt[t]} onChange={() => setFlt((p) => ({ ...p, [t]: !p[t] }))} />
            {t === 'S' ? 'SMART' : t === 'C' ? 'CORE' : 'Transversal'}
          </label>
        ))}
        <label style={{ fontSize: 12 }}>Adelantar <input type="number" min="0" step="0.5" value={weeks}
          onChange={(e) => setWeeks(parseFloat(e.target.value) || 0)} style={{ width: 52 }} /> sem</label>
        <button className="sec" onClick={() => setCozy((c) => !c)}>{cozy ? 'Compacto' : 'Cómodo'}</button>
        <button className="sec" onClick={() => setCollapsed(new Set())}>Abrir todo</button>
        <button className="sec" onClick={() => setCollapsed(new Set(CATS.map((_, i) => i)))}>Cerrar todo</button>
      </div>

      <div className="chartbox" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 20, boxShadow: '0 1px 0 var(--line)' }}>
          <div style={{ display: 'flex', marginLeft: LBL, borderBottom: '1px solid var(--line)' }}>
            {AX.map((m, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'var(--mut)', padding: '2px 0', borderLeft: '1px solid #f0f0f0' }}>{m}</div>)}
          </div>
        </div>

        <div style={{ position: 'relative', paddingTop: 4 }}>
          {grouped.map(({ cat, ci, items }) => {
            const col = collapsed.has(ci)
            return (
              <div key={ci}>
                <div onClick={() => toggleCat(ci)} style={{ cursor: 'pointer', userSelect: 'none', fontSize: cozy ? 12.5 : 11, fontWeight: 700, padding: '6px 0 3px', borderTop: '1px solid #f2f2f2', display: 'flex', gap: 5 }}>
                  <span style={{ color: 'var(--mut)', width: 10, fontSize: 9 }}>{col ? '▸' : '▾'}</span>{cat} <span style={{ fontWeight: 400, color: '#aaa', fontSize: 9.5 }}>({items.length})</span>
                </div>
                {!col && items.map((t, ti) => {
                  const left = (t.s + 1 - shift) / NAX * 100, width = (t.e - t.s + 1) / NAX * 100
                  return (
                    <div key={ti} style={{ display: 'flex', alignItems: 'center', height: rowH }}>
                      <div title={t.label} style={{ width: LBL, fontSize: fs, color: '#333', paddingRight: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</div>
                      <div style={{ flex: 1, position: 'relative', height: barH, background: gridBg }}>
                        <div style={{ position: 'absolute', top: 1, height: barH - 2, left: `${left}%`, width: `${width}%`, background: COL[t.track], opacity: t.soft ? 0.45 : 1, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {MILES.map((ml, i) => (
            <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, borderLeft: `1.4px dashed ${ml.c}`, left: `calc(${LBL}px + ${ml.f} * (100% - ${LBL}px - 26px))`, zIndex: 5 }}>
              <span style={{ position: 'absolute', top: -2, left: 4, whiteSpace: 'nowrap', fontSize: 8.5, fontWeight: 500, color: ml.c }}>{ml.t}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#555', marginTop: 10 }}>
        <span><span style={{ display: 'inline-block', width: 13, height: 11, borderRadius: 2, background: '#E40521', marginRight: 4, verticalAlign: 'middle' }} />SMART</span>
        <span><span style={{ display: 'inline-block', width: 13, height: 11, borderRadius: 2, background: '#2C8A7B', marginRight: 4, verticalAlign: 'middle' }} />CORE</span>
        <span><span style={{ display: 'inline-block', width: 13, height: 11, borderRadius: 2, background: '#8C92A0', marginRight: 4, verticalAlign: 'middle' }} />Transversal</span>
        <span style={{ color: '#7A4A86' }}>▮ Convención Comercial</span>
        <span style={{ color: '#B5841C' }}>▮ hito</span>
      </div>
    </div>
  )
}
