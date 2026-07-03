import { Fragment, useEffect, useState } from 'react'
import { DEFAULTS, TIER_SEED } from '../data/model'
import type { TierKey, Campaign } from '../data/model'
import {
  defaultPlaneacion, generateColegios, asignarPorTipo, liberarPorTipo,
  contarPorTipo, cargaAsesor, resumen, setServicio, renombrarColegio, patchColegio, avanceAsignado, ESTATUS,
  hoyISO, urgencia, agendaAsesor, serviciosDeAsesor, SERIES, INGLES, SATISFACCION,
} from '../data/planeacion'
import type { PlaneacionData, Estatus, Servicio, Urgencia, Colegio } from '../data/planeacion'
import { loadLocal, saveLocal, loadRemote, saveRemote } from '../lib/planeacionStore'

const SMART = '#2563B0', CORE = '#2C8A7B'
const CAMPS: Campaign[] = ['SMART', 'CORE']
const tierLabel = (k: TierKey) => TIER_SEED.find((t) => t.key === k)?.label ?? k
const EST_COLOR: Record<Estatus, string> = { pendiente: '#9AA1AC', agendado: '#B5841C', realizado: '#2C8A7B' }
const EST_LABEL: Record<Estatus, string> = { pendiente: 'Pendiente', agendado: 'Agendado', realizado: 'Realizado' }
const SERV_SHORT: Record<string, string> = { uso: 'Uso', prof: 'Prof.', didac: 'Didác.' }

export default function Planeacion() {
  const [data, setData] = useState<PlaneacionData>(() => loadLocal() ?? defaultPlaneacion())
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('Cargando…')
  const [targetSel, setTargetSel] = useState('')
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [view, setView] = useState<'asignacion' | 'hoja' | 'resumen'>('asignacion')
  const [hojaView, setHojaView] = useState<'colegio' | 'agenda'>('colegio')
  const [fEstatus, setFEstatus] = useState<'todos' | 'pendiente' | 'agendado' | 'realizado' | 'vencidos'>('todos')
  const [fCamp, setFCamp] = useState<'todos' | Campaign>('todos')
  const [fTier, setFTier] = useState<'todos' | TierKey>('todos')
  const [fSerie, setFSerie] = useState<string>('todos')
  const [fIngles, setFIngles] = useState<string>('todos')
  const [fSat, setFSat] = useState<string>('todos')
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())
  const [notaAbierta, setNotaAbierta] = useState<string | null>(null)

  // carga remota inicial: lo remoto gana si existe
  useEffect(() => {
    let alive = true
    loadRemote().then((res) => {
      if (!alive) return
      if (res.source === 'remote') setData(res.data)
      setStatus(res.source === 'remote' ? 'Sincronizado' : 'Sin conexión · local')
      setReady(true)
    })
    return () => { alive = false }
  }, [])

  // guardado: local inmediato + remoto con debounce
  useEffect(() => {
    if (!ready) return
    saveLocal(data)
    const t = window.setTimeout(() => {
      setStatus('Guardando…')
      saveRemote(data).then((r) => setStatus(r.ok ? 'Sincronizado' : 'Sin conexión · local'))
    }, 700)
    return () => clearTimeout(t)
  }, [data, ready])

  // asesor seleccionado válido (derivado, sin efecto): cae al primero si el actual no existe
  const target = data.asesores.some((a) => a.id === targetSel) ? targetSel : (data.asesores[0]?.id ?? '')

  const amt = (key: string) => amounts[key] ?? 1
  const setAmt = (key: string, v: number) => setAmounts((p) => ({ ...p, [key]: Math.max(0, v) }))

  const doAssign = (camp: Campaign, tier: TierKey) =>
    setData((d) => ({ ...d, colegios: asignarPorTipo(d.colegios, camp, tier, amt(camp + '-' + tier), target) }))
  const doRelease = (camp: Campaign, tier: TierKey) =>
    setData((d) => ({ ...d, colegios: liberarPorTipo(d.colegios, camp, tier, amt(camp + '-' + tier), target) }))
  const regenerar = () => {
    if (!window.confirm('Regenerar cupos desde el Simulador borra las asignaciones y el avance actuales. ¿Continuar?')) return
    setData((d) => ({ ...d, colegios: generateColegios(DEFAULTS.vSmart, DEFAULTS.tiersSmart, DEFAULTS.vCore, DEFAULTS.tiersCore) }))
  }
  const setServ = (colegioId: string, idx: number, patch: Partial<Servicio>) =>
    setData((d) => ({ ...d, colegios: setServicio(d.colegios, colegioId, idx, patch) }))
  const renombrar = (id: string, nombre: string) =>
    setData((d) => ({ ...d, colegios: renombrarColegio(d.colegios, id, nombre) }))
  const patchCol = (id: string, patch: Partial<Colegio>) =>
    setData((d) => ({ ...d, colegios: patchColegio(d.colegios, id, patch) }))

  const res = resumen(data.colegios)
  const targetName = data.asesores.find((a) => a.id === target)?.nombre ?? '—'
  const misColegios = data.colegios.filter((c) => c.asesorId === target)
  const cargaT = cargaAsesor(data.colegios, target)
  const pctT = cargaT.servicios ? Math.round((cargaT.realizados / cargaT.servicios) * 100) : 0

  // agenda / filtros de la hoja
  const hoy = hoyISO()
  const ag = agendaAsesor(data.colegios, target, hoy)
  const filtroColegio = (campaign: Campaign, tier: TierKey, serie?: string, ingles?: string, satisfaccion?: number): boolean => {
    if (fCamp !== 'todos' && campaign !== fCamp) return false
    if (fTier !== 'todos' && tier !== fTier) return false
    if (fSerie !== 'todos' && (serie ?? '') !== fSerie) return false
    if (fIngles !== 'todos' && (ingles ?? '') !== fIngles) return false
    if (fSat !== 'todos') {
      if (fSat === 'sin') { if (satisfaccion) return false }
      else if (String(satisfaccion ?? '') !== fSat) return false
    }
    return true
  }
  const pasaServicio = (s: Servicio): boolean => {
    if (fEstatus === 'todos') return true
    if (fEstatus === 'vencidos') return urgencia(s, hoy) === 'vencido'
    return s.estatus === fEstatus
  }
  const toggleColapso = (id: string) => setColapsados((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const URG_BG: Record<Urgencia, string | undefined> = { vencido: '#FBF3E6', proximo: undefined, realizado: undefined, agendado: undefined, sinfecha: undefined }
  const URG_BADGE: Partial<Record<Urgencia, { t: string; c: string }>> = { vencido: { t: 'Vencido', c: '#B5841C' }, proximo: { t: 'Esta sem.', c: '#2563B0' } }
  const dateStyle = { fontSize: 10, padding: '2px 2px', width: 104, boxSizing: 'border-box' as const }

  // controles de un servicio (funciones que devuelven JSX; no son componentes con hooks)
  const chkHecho = (colId: string, idx: number, s: Servicio) => (
    <input type="checkbox" checked={s.estatus === 'realizado'} title="Marcar realizado (pone la fecha de hoy)"
      onChange={(e) => e.target.checked
        ? setServ(colId, idx, { estatus: 'realizado', fechaReal: s.fechaReal ?? hoy })
        : setServ(colId, idx, { estatus: 'pendiente', fechaReal: undefined })} />
  )
  const selEstatus = (colId: string, idx: number, s: Servicio) => (
    <select value={s.estatus}
      onChange={(e) => { const est = e.target.value as Estatus; setServ(colId, idx, est === 'realizado' && !s.fechaReal ? { estatus: est, fechaReal: hoy } : { estatus: est }) }}
      style={{ borderLeft: `3px solid ${EST_COLOR[s.estatus]}`, fontSize: 11, padding: '2px 3px', minWidth: 96, width: '100%' }}>
      {ESTATUS.map((e) => <option key={e} value={e}>{EST_LABEL[e]}</option>)}
    </select>
  )
  const inpPlan = (colId: string, idx: number, s: Servicio) => (
    <input type="date" value={s.fechaPlan ?? ''} onChange={(e) => setServ(colId, idx, { fechaPlan: e.target.value || undefined })} style={dateStyle} />
  )
  const inpReal = (colId: string, idx: number, s: Servicio) => (
    s.estatus === 'pendiente'
      ? <span style={{ color: '#B7BCC4' }}>—</span>
      : <input type="date" value={s.fechaReal ?? ''} onChange={(e) => setServ(colId, idx, { fechaReal: e.target.value || undefined })} style={dateStyle} />
  )
  const btnNota = (colId: string, idx: number, s: Servicio) => {
    const key = colId + ':' + idx
    return <button title={s.nota ? s.nota : 'Agregar nota'} onClick={() => setNotaAbierta((k) => k === key ? null : key)}
      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, opacity: s.nota ? 1 : 0.4 }}>✎</button>
  }
  const inpNota = (colId: string, idx: number, s: Servicio, cols: number) => {
    const key = colId + ':' + idx
    if (notaAbierta !== key) return null
    return (
      <tr><td colSpan={cols} style={{ padding: '2px 4px' }}>
        <input value={s.nota ?? ''} autoFocus placeholder="Nota…" onChange={(e) => setServ(colId, idx, { nota: e.target.value || undefined })}
          style={{ width: '100%', fontSize: 11, padding: '3px 4px', boxSizing: 'border-box' }} />
      </td></tr>
    )
  }

  // resumen / reconciliación (capacidad tomada de las semillas del Simulador, como los cupos)
  const av = avanceAsignado(data.colegios)
  const pctG = av.servicios ? Math.round((av.realizados / av.servicios) * 100) : 0
  const capAnual = Math.round(DEFAULTS.nAse * DEFAULTS.tDay * DEFAULTS.dWeek * DEFAULTS.wMonth * 12)
  const perAseCap = DEFAULTS.tDay * DEFAULTS.dWeek * DEFAULTS.wMonth * 12
  const capOk = av.usoProf <= capAnual
  const sinAsignarServ = data.colegios.reduce((s, c) => s + (c.asesorId ? 0 : c.servicios.length), 0)

  return (
    <div>
      <h1>Planeación de servicios · hojas de asesores</h1>
      <div className="sub">Asigna cupos de colegios a cada asesor empleado; los servicios de cada colegio salen de su tipo
        (matriz del Simulador). Lo que no asignes lo cubren externos. <b>· {status}</b></div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <div className="kpi"><div className="v">{res.total}</div><div className="l">Cupos totales</div></div>
        <div className="kpi good"><div className="v">{res.asignados}</div><div className="l">Asignados</div></div>
        <div className="kpi warn"><div className="v">{res.sinAsignar}</div><div className="l">Sin asignar (externos)</div></div>
      </div>

      <div className="row-btn" style={{ margin: '10px 0' }}>
        <button className="sec" onClick={regenerar}>Regenerar cupos</button>
      </div>

      <div className="seg" style={{ maxWidth: 520, margin: '0 0 12px' }}>
        <button className={view === 'asignacion' ? 'on' : ''} onClick={() => setView('asignacion')}>Asignación</button>
        <button className={view === 'hoja' ? 'on' : ''} onClick={() => setView('hoja')}>Hoja del asesor</button>
        <button className={view === 'resumen' ? 'on' : ''} onClick={() => setView('resumen')}>Resumen</button>
      </div>

      {view === 'resumen' && (<>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
          <div className="kpi"><div className="v">{av.colegios}</div><div className="l">Colegios asignados</div></div>
          <div className="kpi good"><div className="v">{pctG}%</div><div className="l">Avance ({av.realizados}/{av.servicios} servicios)</div></div>
          <div className="kpi warn"><div className="v">{av.servicios - av.realizados}</div><div className="l">Servicios pendientes</div></div>
        </div>

        <h2>Reconciliación con la capacidad de empleados</h2>
        <div className={`kpi ${capOk ? 'good' : 'warn'}`} style={{ marginBottom: 10 }}>
          <div className="v">{capOk ? '✓ Dentro de capacidad' : '⚠ Excede capacidad'}</div>
          <div className="l">Uso/prof asignado a empleados: <b>{av.usoProf}</b> de <b>{capAnual}</b> de capacidad anual
            ({DEFAULTS.nAse} asesores). {capOk ? 'Cabe en los empleados.' : 'El excedente tendría que irse a externos.'}</div>
        </div>
        <div className="hint">Los empleados solo cubren <b>uso/profundización</b>. Las <b>didácticas</b> de colegios asignados
          ({av.didac}) y los <b>{sinAsignarServ}</b> servicios sin asignar los cubren <b>externos</b>. La capacidad sale de
          las semillas del Simulador (asesores × servicios/día × días × semanas × 12 meses).</div>

        <h2>Avance por asesor</h2>
        <table>
          <thead><tr><th>Asesor</th><th>Colegios</th><th>Servicios</th><th>Realizados</th><th>Avance</th><th>Uso/prof</th><th>Carga</th></tr></thead>
          <tbody>
            {data.asesores.map((a) => {
              const c = cargaAsesor(data.colegios, a.id)
              const pct = c.servicios ? Math.round((c.realizados / c.servicios) * 100) : 0
              const over = c.usoProf > perAseCap
              return (
                <tr key={a.id}>
                  <td>{a.nombre}</td><td>{c.colegios}</td><td>{c.servicios}</td><td>{c.realizados}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 6, background: '#EEF1F4', overflow: 'hidden', minWidth: 60 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#2C8A7B' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#646A75' }}>{pct}%</span>
                    </div>
                  </td>
                  <td>{c.usoProf}</td>
                  <td style={{ color: over ? '#B5841C' : '#646A75', fontWeight: over ? 600 : 400 }}>
                    {over ? `⚠ ${Math.round(perAseCap)} máx` : 'ok'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="hint">«Carga» avisa si el uso/prof asignado a un asesor supera su capacidad anual individual (≈ {Math.round(perAseCap)} servicios).</div>
      </>)}

      {view !== 'resumen' && (
      <div className="cols">
        <div className="panel">
          <h3>Asesores</h3>
          {data.asesores.map((a) => {
            const c = cargaAsesor(data.colegios, a.id)
            const on = a.id === target
            return (
              <button key={a.id} onClick={() => setTargetSel(a.id)}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left',
                  padding: '6px 8px', marginBottom: 4, borderRadius: 8, cursor: 'pointer',
                  border: on ? `2px solid ${SMART}` : '1px solid #E3E6EB', background: on ? '#F3F7FC' : '#fff' }}>
                <span style={{ fontWeight: on ? 600 : 400 }}>{a.nombre}</span>
                <span style={{ color: '#646A75', fontSize: 12 }}>{c.colegios} col · {c.servicios} serv</span>
              </button>
            )
          })}
        </div>

        <div>
          {view === 'asignacion' && (<>
            <h2>Asignar a {targetName}</h2>
            <table>
              <thead><tr><th>Campaña</th><th>Tipo</th><th>Sin asignar</th><th>De este asesor</th><th>Cantidad</th><th></th></tr></thead>
              <tbody>
                {CAMPS.flatMap((camp) => TIER_SEED.map((t) => {
                  const key = camp + '-' + t.key
                  const disp = contarPorTipo(data.colegios, camp, t.key)
                  const mine = contarPorTipo(data.colegios, camp, t.key, target)
                  return (
                    <tr key={key}>
                      <td style={{ color: camp === 'SMART' ? SMART : CORE, fontWeight: 600 }}>{camp}</td>
                      <td>{tierLabel(t.key)}</td>
                      <td>{disp}</td>
                      <td>{mine}</td>
                      <td><input type="number" min={0} value={amt(key)} onChange={(e) => setAmt(key, parseInt(e.target.value) || 0)} style={{ width: 64 }} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="sec" disabled={!target || disp === 0} onClick={() => doAssign(camp, t.key)}>Asignar</button>{' '}
                        <button className="sec" disabled={!target || mine === 0} onClick={() => doRelease(camp, t.key)}>Quitar</button>
                      </td>
                    </tr>
                  )
                }))}
              </tbody>
            </table>
            <div className="hint">Asigna en tandas: escribe la cantidad y pulsa «Asignar». Lo que no asignes lo cubren externos.</div>
          </>)}

          {view === 'hoja' && (<>
            <h2>Hoja de {targetName}</h2>
            {misColegios.length === 0 ? (
              <div className="hint">Este asesor no tiene colegios asignados. Ve a «Asignación» para darle cupos.</div>
            ) : (<>
              <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', marginBottom: 8 }}>
                <div className={`kpi ${ag.vencidos > 0 ? 'warn' : ''}`}><div className="v">{ag.vencidos}</div><div className="l">Vencidos</div></div>
                <div className="kpi"><div className="v">{ag.estaSemana}</div><div className="l">Esta semana</div></div>
                <div className="kpi"><div className="v">{ag.porHacer}</div><div className="l">Por hacer</div></div>
                <div className="kpi good"><div className="v">{pctT}%</div><div className="l">Avance ({cargaT.realizados}/{cargaT.servicios})</div></div>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: '#EEF1F4', overflow: 'hidden', margin: '0 0 12px' }}>
                <div style={{ height: '100%', width: `${pctT}%`, background: EST_COLOR.realizado }} />
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <div className="seg" style={{ maxWidth: 260 }}>
                  <button className={hojaView === 'colegio' ? 'on' : ''} onClick={() => setHojaView('colegio')}>Por colegio</button>
                  <button className={hojaView === 'agenda' ? 'on' : ''} onClick={() => setHojaView('agenda')}>Agenda</button>
                </div>
                <select value={fEstatus} onChange={(e) => setFEstatus(e.target.value as typeof fEstatus)} style={{ width: 'auto' }}>
                  <option value="todos">Todos los estatus</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="agendado">Agendados</option>
                  <option value="realizado">Realizados</option>
                  <option value="vencidos">Vencidos</option>
                </select>
                <select value={fCamp} onChange={(e) => setFCamp(e.target.value as typeof fCamp)} style={{ width: 'auto' }}>
                  <option value="todos">Ambas campañas</option>
                  <option value="SMART">SMART</option>
                  <option value="CORE">CORE</option>
                </select>
                <select value={fTier} onChange={(e) => setFTier(e.target.value as typeof fTier)} style={{ width: 'auto' }}>
                  <option value="todos">Todos los tipos</option>
                  {TIER_SEED.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <select value={fSerie} onChange={(e) => setFSerie(e.target.value)} style={{ width: 'auto' }}>
                  <option value="todos">Toda serie</option>
                  {SERIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={fIngles} onChange={(e) => setFIngles(e.target.value)} style={{ width: 'auto' }}>
                  <option value="todos">Todo inglés</option>
                  {INGLES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={fSat} onChange={(e) => setFSat(e.target.value)} style={{ width: 'auto' }}>
                  <option value="todos">Toda satisfacción</option>
                  {SATISFACCION.map((s) => <option key={s.v} value={String(s.v)}>{s.emoji} {s.label}</option>)}
                  <option value="sin">Sin calificar</option>
                </select>
                {hojaView === 'colegio' && (
                  <button className="sec" onClick={() => setColapsados((p) => p.size ? new Set() : new Set(misColegios.map((c) => c.id)))}>
                    {colapsados.size ? 'Expandir todo' : 'Colapsar todo'}
                  </button>
                )}
              </div>

              {hojaView === 'colegio' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 820px)', gap: 10 }}>
                  {misColegios.filter((c) => filtroColegio(c.campaign, c.tier, c.serie, c.ingles, c.satisfaccion)).map((c) => {
                    const visibles = c.servicios.map((s, i) => ({ s, i })).filter(({ s }) => pasaServicio(s))
                    if (visibles.length === 0) return null
                    const done = c.servicios.filter((s) => s.estatus === 'realizado').length
                    const total = c.servicios.length
                    const abierto = !colapsados.has(c.id)
                    return (
                      <div key={c.id} className="panel" style={{ margin: 0 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                          <button onClick={() => toggleColapso(c.id)} title={abierto ? 'Colapsar' : 'Expandir'}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#646A75', padding: 0, width: 14 }}>{abierto ? '▾' : '▸'}</button>
                          <span style={{ width: 9, height: 9, borderRadius: 9, flex: '0 0 auto', background: c.campaign === 'SMART' ? SMART : CORE }} />
                          <input value={c.nombre} onChange={(e) => renombrar(c.id, e.target.value)}
                            style={{ flex: 1, minWidth: 0, border: 'none', fontWeight: 600, fontSize: 13, background: 'transparent', padding: 0 }} />
                          {c.satisfaccion ? <span title={SATISFACCION.find((s) => s.v === c.satisfaccion)?.label} style={{ fontSize: 15 }}>{SATISFACCION.find((s) => s.v === c.satisfaccion)?.emoji}</span> : null}
                          <span style={{ fontSize: 11, color: '#646A75', flex: '0 0 auto' }}>{c.campaign} · {tierLabel(c.tier)}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 5, background: '#EEF1F4', overflow: 'hidden', marginBottom: 2 }}>
                          <div style={{ height: '100%', width: total ? `${(done / total) * 100}%` : '0%', background: EST_COLOR.realizado }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#646A75', marginBottom: 4 }}>{done}/{total} realizados</div>
                        {abierto && (<>
                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', margin: '6px 0 8px', fontSize: 11, color: '#646A75' }}>
                            <label>Serie{' '}
                              <select value={c.serie ?? ''} onChange={(e) => patchCol(c.id, { serie: e.target.value || undefined })} style={{ fontSize: 11 }}>
                                <option value="">—</option>{SERIES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </label>
                            <label>Inglés{' '}
                              <select value={c.ingles ?? ''} onChange={(e) => patchCol(c.id, { ingles: e.target.value || undefined })} style={{ fontSize: 11 }}>
                                <option value="">—</option>{INGLES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </label>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 1 }}>Satisfacción:
                              {SATISFACCION.map((s) => (
                                <button key={s.v} title={s.label} onClick={() => patchCol(c.id, { satisfaccion: c.satisfaccion === s.v ? undefined : s.v })}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: '0 1px', opacity: c.satisfaccion === s.v ? 1 : 0.3, filter: c.satisfaccion === s.v ? 'none' : 'grayscale(1)' }}>{s.emoji}</button>
                              ))}
                            </span>
                          </div>
                          <table style={{ fontSize: 11 }}>
                            <thead><tr><th style={{ width: 20 }}></th><th>Servicio</th><th>Estatus</th><th>Planeada</th><th>Real</th><th style={{ width: 20 }}></th></tr></thead>
                            <tbody>
                              {visibles.map(({ s, i }) => {
                                const u = urgencia(s, hoy); const badge = URG_BADGE[u]
                                return (
                                  <Fragment key={i}>
                                    <tr style={{ background: URG_BG[u] }}>
                                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>{chkHecho(c.id, i, s)}</td>
                                      <td style={{ padding: '2px 4px' }}>{SERV_SHORT[s.tipo]}{badge && <span style={{ color: badge.c, fontSize: 9, marginLeft: 3 }}>· {badge.t}</span>}</td>
                                      <td style={{ padding: '2px 4px' }}>{selEstatus(c.id, i, s)}</td>
                                      <td style={{ padding: '2px 4px' }}>{inpPlan(c.id, i, s)}</td>
                                      <td style={{ padding: '2px 4px' }}>{inpReal(c.id, i, s)}</td>
                                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>{btnNota(c.id, i, s)}</td>
                                    </tr>
                                    {inpNota(c.id, i, s, 6)}
                                  </Fragment>
                                )
                              })}
                            </tbody>
                          </table>
                          <textarea value={c.notasGenerales ?? ''} placeholder="Notas generales del colegio…"
                            onChange={(e) => patchCol(c.id, { notasGenerales: e.target.value || undefined })}
                            style={{ width: '100%', fontSize: 12, padding: '4px 6px', marginTop: 8, boxSizing: 'border-box', minHeight: 42, resize: 'vertical' }} />
                        </>)}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <table>
                  <thead><tr><th style={{ width: 24 }}></th><th>Colegio</th><th>Campaña</th><th>Servicio</th><th>Estatus</th><th>Planeada</th><th>Real</th><th style={{ width: 24 }}></th></tr></thead>
                  <tbody>
                    {serviciosDeAsesor(data.colegios, target)
                      .filter((r) => filtroColegio(r.campaign, r.tier, r.serie, r.ingles, r.satisfaccion) && pasaServicio(r.servicio))
                      .sort((a, b) => (a.servicio.fechaPlan ?? '9999').localeCompare(b.servicio.fechaPlan ?? '9999'))
                      .map((r) => {
                        const u = urgencia(r.servicio, hoy); const badge = URG_BADGE[u]
                        return (
                          <Fragment key={r.colegioId + ':' + r.idx}>
                            <tr style={{ background: URG_BG[u] }}>
                              <td style={{ padding: '2px 4px', textAlign: 'center' }}>{chkHecho(r.colegioId, r.idx, r.servicio)}</td>
                              <td style={{ padding: '2px 4px' }}>{r.colegioNombre}</td>
                              <td style={{ padding: '2px 4px', color: r.campaign === 'SMART' ? SMART : CORE, whiteSpace: 'nowrap' }}>{r.campaign} · {tierLabel(r.tier)}</td>
                              <td style={{ padding: '2px 4px' }}>{SERV_SHORT[r.servicio.tipo]}{badge && <span style={{ color: badge.c, fontSize: 9, marginLeft: 3 }}>· {badge.t}</span>}</td>
                              <td style={{ padding: '2px 4px', minWidth: 110 }}>{selEstatus(r.colegioId, r.idx, r.servicio)}</td>
                              <td style={{ padding: '2px 4px' }}>{inpPlan(r.colegioId, r.idx, r.servicio)}</td>
                              <td style={{ padding: '2px 4px' }}>{inpReal(r.colegioId, r.idx, r.servicio)}</td>
                              <td style={{ padding: '2px 4px', textAlign: 'center' }}>{btnNota(r.colegioId, r.idx, r.servicio)}</td>
                            </tr>
                            {inpNota(r.colegioId, r.idx, r.servicio, 8)}
                          </Fragment>
                        )
                      })}
                  </tbody>
                </table>
              )}
            </>)}
          </>)}
        </div>
      </div>
      )}
    </div>
  )
}
