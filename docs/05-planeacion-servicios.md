# 05 · Planeación de servicios académicos (hojas de asesores)

**Estado:** diseño aprobado, **pendiente de implementar** (rama `nueva-logica`).
**Archivos previstos:** `src/pages/Planeacion.tsx` (+ `src/features/planeacion/` si crece) · `src/lib/planeacionStore.ts` (Supabase) · lee la matriz de tipos de `src/data/model.ts`.

Es la capa **operativa** debajo del Simulador. El Simulador planea en **agregado** ("se necesitan X servicios en Y colegios, con esta capacidad"); esta hoja baja al **quién ejecuta**: a cada **asesor empleado** se le asignan colegios y él registra el avance servicio por servicio.

---

## 1. Decisiones de diseño (tomadas con el usuario, jul 2026)

| Tema | Decisión |
|---|---|
| Origen de colegios | **Cupos generados** desde los conteos del Simulador (anónimos), **listos para carga CSV** después. |
| Asignación | **100% manual** (el coordinador decide), con **selección múltiple** para asignar en tandas. |
| Unidad del tablero | **Tarjeta por colegio** (adentro sus servicios requeridos). |
| Acceso | **Herramienta central**: eliges al asesor y ves/editas su hoja. **Sin login por persona** (consistente con la arquitectura actual; ver [`04-infraestructura.md`](04-infraestructura.md)). |

---

## 2. Modelo de datos

```ts
type Campaign = 'SMART' | 'CORE';
type TierKey  = 'top' | 'alto' | 'medio' | 'bajo';   // de model.ts
type Estatus  = 'pendiente' | 'agendado' | 'realizado';

interface Servicio {
  tipo: 'uso' | 'prof' | 'didac';
  estatus: Estatus;
  fechaPlan?: string;   // ISO 'YYYY-MM-DD'
  fechaReal?: string;
  nota?: string;
}

interface Colegio {          // "cupo": anónimo hoy, con nombre real tras CSV
  id: string;                // estable (p.ej. 'SMART-top-001') → clave para el CSV
  nombre: string;            // editable; el CSV lo sobreescribe
  campaign: Campaign;
  tier: TierKey;
  asesorId: string | null;   // null = sin asignar (lo cubren externos)
  servicios: Servicio[];     // congelados al generar (ver §3)
}

interface Asesor { id: string; nombre: string; }

interface PlaneacionData {    // payload único en Supabase
  asesores: Asesor[];
  colegios: Colegio[];
}
```

---

## 3. Servicios requeridos: se **heredan** del tipo (fuente única)

El "criterio de volumen y segmentación" **no se captura a mano**. Cuando se genera un cupo de tipo `T` en la campaña `C`, sus `servicios` salen de la **matriz de tipos del Simulador** (`model.ts`): `tiers[T]` da cuántos `uso`, `prof` y `didac` requiere ese colegio (Top → 3-2-1, etc.).

> ⚠️ **Se congela al generar.** Los `servicios` se materializan y **se guardan** en el cupo. Si alguien luego edita la matriz en el Simulador, las hojas ya generadas **no cambian solas** (el plan operativo debe ser estable). Para re-alinear, se regeneran los cupos. Esto es deliberado: evita que el avance ya registrado se corrompa por un cambio de supuestos.

---

## 4. Generación de cupos y **escala**

Los conteos del Simulador dan **~1,368 cupos** (321 SMART + 1,047 CORE, repartidos por la mezcla % de cada tipo). Renderizar eso como tarjetas es inviable. Estrategia:

- El **pool** de colegios sin asignar se muestra como **lista compacta filtrable** (campaña + tipo), nunca como 1,368 tarjetas.
- Las **tarjetas** (pesadas) se renderizan **solo para el asesor seleccionado**.
- Generar es idempotente por `id`: regenerar respeta asignaciones/estatus existentes por `id` cuando sea posible.
- Un control decide cuántos cupos generar (por defecto, los del Simulador); no todos tienen que asignarse: lo **no asignado = externos**.

---

## 5. Pantallas (MVP)

1. **Asignación (coordinador).** Catálogo de asesores con su **carga** (servicios asignados vs. capacidad/mes del Simulador). Pool filtrable con **selección múltiple** → "Asignar a [asesor]" / "Quitar". Contadores asignado / sin asignar / total.
2. **Hoja del asesor.** Selector de asesor → **tarjetas** de sus colegios. Cada tarjeta: nombre · campaña · tipo, y sus `servicios` con **toggle de estatus** (pendiente→agendado→realizado) y fechas **planeada/real**. **Barra de avance** (X/Y realizados, desglosado por tipo).
3. **Resumen.** Avance % por asesor y global, pendientes, quién está **sobrecargado** (asignado > capacidad).

---

## 6. Reconciliación con el Simulador

Un bloque de control que compara, para no perder el hilo con la planeación agregada:

- **Servicios asignados** (Σ de los cupos con asesor) **vs. capacidad de empleados** (del Simulador) **vs. plan total**.
- Semáforo: verde si lo asignado a empleados ≤ capacidad; aviso si se sobrepasa (habría que mandar a externos).
- Recordatorio: los empleados solo cubren **uso/profundización**; las **didácticas siempre son externas** (regla del modelo). En las hojas, las didácticas pueden mostrarse como referencia pero su ejecución es externa.

---

## 7. Persistencia

- Tabla nueva **`sm_campanas_planeacion`** (una fila, `id` fijo, columna `data jsonb` con `PlaneacionData`). Respeta el prefijo `sm_campanas_` (convención del proyecto).
- Mismo patrón que el Gantt (`src/lib/ganttStore.ts`): carga remota gana sobre local, guardado con **debounce**, degradación a `localStorage` si no hay red. Ver [`02-gantt.md`](02-gantt.md) §3 y [`04-infraestructura.md`](04-infraestructura.md) §1.
- ⚠️ **Sin control de edición concurrente** (igual que el Gantt): el último que guarda pisa. Aceptable para el uso actual.

---

## 8. Ruta a CSV (segunda iteración)

El modelo ya queda listo para carga real de colegios:

- CSV con columnas mínimas: `nombre, campaña, tipo` (y opcional `id`, `asesor`).
- La carga **reemplaza/mapea** cupos por `id` (o crea nuevos), preservando asignaciones y estatus donde el `id` coincida.
- Al importar, los `servicios` se derivan del `tipo` con la matriz vigente (§3).

---

## 9. Plan de construcción (MVP por fases)

1. **Generación + asignación:** tipos, store de Supabase, generación de cupos desde el Simulador, pool filtrable, asignación manual múltiple.
2. **Hoja del asesor:** tarjetas por colegio, estatus, fechas, barra de avance.
3. **Resumen + reconciliación:** rollups por asesor/global y semáforo vs. capacidad.
4. *(Después)* línea de tiempo tipo Gantt y **carga CSV**.

Nueva ruta `#/planeacion` y su `NavLink` en `src/App.tsx`.

---

## 10. Invariantes / reglas a respetar

- La derivación de servicios por tipo usa la **matriz del Simulador** (`model.ts`), no números sueltos. Fuente única.
- Los `servicios` se **congelan** en el cupo al generar (§3); no se recomputan en cada render.
- Prefijo **`sm_campanas_`** en cualquier tabla nueva de Supabase.
- Colores de datos: azul = SMART, teal = CORE (regla global; el rojo/amarillo del Simulador §2 es la única excepción). Para estatus, usa la paleta de `STATUS` del Gantt (`constants.ts`), no rojo arbitrario.
- No renderizar el pool completo como tarjetas (§4).

## 11. Qué NO hace (alcance)

- No hay login por asesor (herramienta central).
- No auto-reparte la asignación (es manual).
- No re-sincroniza servicios ya congelados cuando cambia la matriz (se regenera a propósito).
