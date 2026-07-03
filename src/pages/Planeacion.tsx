import { useEffect, useState } from 'react'
import { DEFAULTS, TIER_SEED } from '../data/model'
import type { TierKey, Campaign } from '../data/model'
import {
  defaultPlaneacion, generateColegios, asignarPorTipo, liberarPorTipo,
  contarPorTipo, cargaAsesor, resumen, setServicio, renombrarColegio, ESTATUS,
} from '../data/planeacion'
import type { PlaneacionData, Estatus, Servicio } from '../data/planeacion'
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
  const [view, setView] = useState<'asignacion' | 'hoja'>('asignacion')

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

  const res = resumen(data.colegios)
  const targetName = data.asesores.find((a) => a.id === target)?.nombre ?? '—'
  const misColegios = data.colegios.filter((c) => c.asesorId === target)
  const cargaT = cargaAsesor(data.colegios, target)
  const pctT = cargaT.servicios ? Math.round((cargaT.realizados / cargaT.servicios) * 100) : 0

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

      <div className="seg" style={{ maxWidth: 380, margin: '0 0 12px' }}>
        <button className={view === 'asignacion' ? 'on' : ''} onClick={() => setView('asignacion')}>Asignación</button>
        <button className={view === 'hoja' ? 'on' : ''} onClick={() => setView('hoja')}>Hoja del asesor</button>
      </div>

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
              <div className="capnote" style={{ color: '#2C2F36' }}>{cargaT.realizados}/{cargaT.servicios} servicios realizados · {pctT}% ({cargaT.colegios} colegios)</div>
              <div style={{ height: 8, borderRadius: 8, background: '#EEF1F4', overflow: 'hidden', margin: '6px 0 12px' }}>
                <div style={{ height: '100%', width: `${pctT}%`, background: EST_COLOR.realizado }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
                {misColegios.map((c) => {
                  const done = c.servicios.filter((s) => s.estatus === 'realizado').length
                  const total = c.servicios.length
                  return (
                    <div key={c.id} className="panel" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 9, flex: '0 0 auto', background: c.campaign === 'SMART' ? SMART : CORE }} />
                        <input value={c.nombre} onChange={(e) => renombrar(c.id, e.target.value)}
                          style={{ flex: 1, minWidth: 0, border: 'none', fontWeight: 600, fontSize: 13, background: 'transparent', padding: 0 }} />
                        <span style={{ fontSize: 11, color: '#646A75', flex: '0 0 auto' }}>{c.campaign} · {tierLabel(c.tier)}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 5, background: '#EEF1F4', overflow: 'hidden', marginBottom: 2 }}>
                        <div style={{ height: '100%', width: total ? `${(done / total) * 100}%` : '0%', background: EST_COLOR.realizado }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#646A75', marginBottom: 4 }}>{done}/{total} realizados</div>
                      <table style={{ fontSize: 11 }}>
                        <thead><tr><th>Servicio</th><th>Estatus</th><th>Plan.</th><th>Real</th></tr></thead>
                        <tbody>
                          {c.servicios.map((s, i) => (
                            <tr key={i}>
                              <td style={{ padding: '2px 4px' }}>{SERV_SHORT[s.tipo]}</td>
                              <td style={{ padding: '2px 4px' }}>
                                <select value={s.estatus} onChange={(e) => setServ(c.id, i, { estatus: e.target.value as Estatus })}
                                  style={{ borderLeft: `3px solid ${EST_COLOR[s.estatus]}`, fontSize: 11, padding: '2px 3px', minWidth: 88, width: '100%' }}>
                                  {ESTATUS.map((e) => <option key={e} value={e}>{EST_LABEL[e]}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '2px 4px' }}><input type="date" value={s.fechaPlan ?? ''} onChange={(e) => setServ(c.id, i, { fechaPlan: e.target.value || undefined })} style={{ fontSize: 10, padding: '2px 2px', width: 104, boxSizing: 'border-box' }} /></td>
                              <td style={{ padding: '2px 4px' }}><input type="date" value={s.fechaReal ?? ''} onChange={(e) => setServ(c.id, i, { fechaReal: e.target.value || undefined })} style={{ fontSize: 10, padding: '2px 2px', width: 104, boxSizing: 'border-box' }} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            </>)}
          </>)}
        </div>
      </div>
    </div>
  )
}
