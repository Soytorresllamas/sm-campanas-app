import { useEffect, useState, type ReactNode } from 'react'
import logoSM from './assets/logo-sm.svg'

// Gate ligero del lado del cliente (hash SHA-256). No es seguridad fuerte: al ser un sitio
// público, un usuario técnico podría saltarlo. Sirve para disuadir el acceso casual.
// Para cambiar la contraseña, genera un nuevo hash:
//   node -e "console.log(require('crypto').createHash('sha256').update('TU_PASSWORD').digest('hex'))"
// y pégalo en PASS_HASH.
const PASS_HASH = '99f8cbcd66a958fbe5edc089f38b5291ea155873a51177daeed297ee8715e088'
const FLAG = 'sm-campanas-unlocked-v1'

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// El portal del asesor (#/mi-hoja) trae su propio login simulado: no pasa por el gate del comité.
const esPortalAsesor = () => window.location.hash.startsWith('#/mi-hoja')

export default function Gate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(() => localStorage.getItem(FLAG) === '1')
  const [portal, setPortal] = useState(esPortalAsesor)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onHash = () => setPortal(esPortalAsesor())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (ok || portal) return children

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(false)
    const h = await sha256(pw)
    if (h === PASS_HASH) { localStorage.setItem(FLAG, '1'); setOk(true) }
    else { setErr(true); setBusy(false); setPw('') }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <img src={logoSM} alt="SM México" className="gate-logo" />
        <h1 className="gate-title">Planeación 2 Campañas</h1>
        <p className="gate-sub">Tablero interno del Comité de Negocios. Ingresa la contraseña para continuar.</p>
        <input type="password" value={pw} autoFocus placeholder="Contraseña"
          className={`gate-input ${err ? 'err' : ''}`} onChange={(e) => { setPw(e.target.value); setErr(false) }} />
        {err && <div className="gate-err">Contraseña incorrecta.</div>}
        <button className="gate-btn" type="submit" disabled={busy || !pw}>{busy ? 'Verificando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
