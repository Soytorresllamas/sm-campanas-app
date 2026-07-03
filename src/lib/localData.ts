// Claves de DATOS de la app en localStorage. No incluye el flag de acceso
// (sm-campanas-unlocked-v1) ni la sesión del asesor (sm-asesor-sesion-v1),
// para que reiniciar los datos no cierre la sesión del usuario.
export const LS_PLANEACION = 'sm-planeacion-26-27-v1'
export const LS_GANTT = 'sm-gantt-26-27-v1'
export const DATA_KEYS = [LS_PLANEACION, LS_GANTT]

/**
 * Borra los datos locales de la app (planeación y gantt) dejando intacto el acceso.
 * La copia sincronizada vive en Supabase, así que al recargar se vuelve a bajar.
 * Lo usa la recuperación ante fallos del ErrorBoundary.
 */
export function resetLocalData(): void {
  try { for (const k of DATA_KEYS) localStorage.removeItem(k) } catch { /* noop */ }
}
