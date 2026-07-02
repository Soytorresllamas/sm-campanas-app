# 02 · Gantt de gestión

**Carpeta:** `src/features/gantt/` (lógica en hooks + componentes) · `src/pages/GanttMarketing.tsx` (compone todo) · `src/lib/ganttStore.ts` + `src/lib/supabase.ts` (persistencia).

Es el módulo más grande. Está partido en piezas chicas justo para poder cambiar una sin romper las demás.

---

## 1. Mapa de piezas

| Archivo | Responsabilidad |
|---|---|
| `types.ts` | Tipos: `Task`, `TrackKey` (S/C/T), `StatusKey`, `GroupBy`, `Zoom`, `ArrowGeom`, etc. |
| `constants.ts` | `TRACKS`, `STATUS`, `OWNERS`, `MODULES` (semillas), `PPD` (px/día por zoom), `SYNC`, y medidas de layout (`LBL`, `ROW_H`…). |
| `dateUtils.ts` | Fechas: `parse`/`toISO` (ISO ↔ ms UTC), `diffDays`, `fmtShort`. |
| `seed.ts` | `buildSeed()`: el plan sembrado (42 acciones + 3 hitos + 12 dependencias) convertido a fechas reales desde Sep 2026. |
| `useHistory.ts` | Deshacer genérico (snapshots JSON); expone `historySize` (estado) para la UI. |
| `useTasks.ts` | **Estado + sincronización + todas las mutaciones.** El cerebro del módulo. |
| `useGanttLayout.ts` | Dominio de fechas, meses del header, filtros, **grupos**, geometría de barras y **flechas** de dependencia. |
| `useDragResize.ts` | Arrastre (Pointer Events) **y** teclado (mover/redimensionar/editar). |
| `GanttToolbar.tsx` · `GanttRow.tsx` · `GanttArrows.tsx` · `TaskEditor.tsx` | Presentación (sin lógica de negocio). |
| `pages/GanttMarketing.tsx` | Junta hooks + componentes; único que sabe de layout de página. |

---

## 2. El modelo `Task`

```ts
{ id, module, name, detail, track: 'S'|'C'|'T', soft: boolean,
  start, end,           // ISO 'YYYY-MM-DD'; en hitos start === end
  owner, status, progress, milestone: boolean,
  dependsOn: string[] } // ids de tareas predecesoras
```
- Las **fechas** son ISO string; internamente se manejan como ms UTC (`parse`/`toISO`) para evitar líos de zona horaria.
- `track` mapea a color/campaña vía `TRACKS`. `soft` = acción de baja intensidad (se pinta translúcida).

---

## 3. Persistencia (local + Supabase)

`useTasks.ts` guarda **el tablero completo** en un solo payload:
```ts
GanttData = { tasks: Task[], modules: string[], owners: string[] }
```
- **Al arrancar:** pinta lo de `localStorage` al instante y luego, cuando responde Supabase, **lo remoto gana** si existe.
- **Al cambiar:** guarda en `localStorage` inmediato + Supabase con **debounce de 700 ms**. El badge de estado (`SYNC`) refleja Cargando/Guardando/Sincronizado/Sin conexión.
- **Compatibilidad hacia atrás:** `loadLocal`/`loadRemote` aceptan el formato viejo (arreglo plano de tareas, sin `modules`/`owners`) para no romper tableros guardados antes.
- ⚠️ **Sin manejo de edición concurrente:** el último que guarda **pisa** al otro, sin aviso. Es una limitación conocida (roadmap #3).

Detalles de la tabla Supabase → ver [`04-infraestructura.md`](04-infraestructura.md).

---

## 4. Módulos y responsables editables

`MODULES`/`OWNERS` en `constants.ts` son **solo la semilla**. El catálogo vivo son los estados `modules`/`owners` de `useTasks.ts` (persistidos en `GanttData`). En el editor lateral (`TaskEditor.tsx`):
- **Módulo:** select con "+ Nuevo módulo…" (lo crea y lo asigna) y enlace "✎ renombrar" → `renameModule(viejo, nuevo)` cambia el nombre para **todas** las tareas de ese módulo.
- **Responsable:** select con "+ Nuevo responsable…" → `addOwner` lo agrega al catálogo, disponible para cualquier tarea.
- `useGanttLayout` recibe `modules` (la lista viva) para agrupar; **no** importa `MODULES` de constants.

---

## 5. Dependencias y flechas

- Cada tarea guarda `dependsOn: string[]`. `useGanttLayout` calcula `arrows` (fin de la predecesora → inicio de la sucesora) como curvas bezier SVG.
- **Conflicto de fechas:** una flecha se pinta **roja punteada** si la sucesora empieza **antes** que su predecesora (`b.s < a.s`). El traslape normal (empezar durante la predecesora) **no** es conflicto — se decidió así porque el plan tiene fases que se traslapan a propósito.
- 🚨 **TRAMPA YA RESUELTA — no la reintroduzcas:** por un quirk de `position:sticky` + SVG dentro de un contenedor con scroll, las flechas se pintaban **encima** de la columna sticky de títulos al hacer scroll horizontal, y **el z-index no lo resolvía** (se probó exhaustivamente). La solución es **recortar el SVG por la izquierda según `scrollLeft`**: `arrowsRef.style.clipPath = inset(0 0 0 {scrollLeft}px)` en cada scroll (`applyArrowClip` en `GanttMarketing.tsx`). **Si tocas el SVG de flechas o el scroll, vuelve a probar con scroll horizontal.**

---

## 6. Interacción: arrastre y teclado

`useDragResize.ts` centraliza ambos caminos y **reusa la misma función** `applyDelta` para que no diverjan:
- **Mouse/touch:** arrastrar el centro = mover; arrastrar los bordes = redimensionar.
- **Teclado** (barra enfocada, `tabIndex=0`, `aria-label`): `←/→` mueve 1 día · `Shift+←/→` cambia duración (mueve el fin) · `Enter`/`Espacio` abre editor. Hitos solo se mueven.
- **Deshacer:** Ctrl/⌘+Z o botón; historial en memoria (se pierde al recargar). Un clic sin mover **no** cuenta como paso (se descarta el snapshot).

---

## 7. Cómo cambiar cosas SIN romper

| Quiero… | Toca… | Cuidado con… |
|---|---|---|
| Cambiar colores de campaña | `TRACKS` en `constants.ts` | SMART azul / CORE teal; **nunca rojo** en barras. |
| Cambiar estatus o sus colores | `STATUS` en `constants.ts` | — |
| Cambiar el plan sembrado | `PLAN`/`DEPS`/`SEEDSTATE` en `seed.ts` | Las dependencias se resuelven por **nombre**; si renombras una tarea en `PLAN`, actualiza `DEPS`. |
| Cambiar el ancho de la columna de títulos | `LBL` en `constants.ts` | El recorte de flechas usa `LBL`; sigue funcionando solo. |
| Cambiar el debounce de guardado | `useTasks.ts` (setTimeout 700) | — |
| Agregar un campo a la tarea | `types.ts` (`Task`) + `seed.ts` + `TaskEditor.tsx` | Datos viejos no lo tendrán → usa `?? valor` al leerlo. |

## 8. Invariantes (NO romper)
- El recorte `clip-path` de las flechas (sección 5).
- No leer un `ref.current` durante el render (lo prohíbe la regla `react-hooks/refs` del lint) — por eso `historySize` es estado, no ref.
- Toda tabla nueva de Supabase va **prefijada `sm_campanas_`**.
