import type { Task, TrackKey, StatusKey } from './types';
import { toISO } from './dateUtils';

/* ---------- semilla: plan convertido a fechas reales (Sep 2026 = índice 0) ---------- */
const BASE_Y = 2026, BASE_M = 8;
const monStart = (i: number) => toISO(Date.UTC(BASE_Y, BASE_M + i, 1));
const monEnd = (i: number) => toISO(Date.UTC(BASE_Y, BASE_M + i + 1, 0));
const ownerFor = (track: TrackKey) => track === 'S' ? 'Comercial SMART' : track === 'C' ? 'Comercial CORE' : 'Marketing';

type PlanRow = [module: string, name: string, mesIni: number, mesFin: number, track: TrackKey, soft: boolean];

const PLAN: PlanRow[] = [
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
];

// Estatus/avance realistas de pre-lanzamiento (jul 2026, arranque en sep). Editable.
const SEEDSTATE: Record<string, { status: StatusKey; progress: number }> = {
  'Limpieza y unificación del CSV nominal': { status: 'doing', progress: 45 },
  'Scoring de propensión por colegio': { status: 'doing', progress: 20 },
  'ICP y persona de compra por bloque': { status: 'doing', progress: 10 },
  'Arquitectura de mensajes por etapa': { status: 'doing', progress: 25 },
  'Kit de demo de uso (asesor pedagógico)': { status: 'doing', progress: 10 },
};

// Dependencias sembradas (tarea → predecesoras por nombre). 100% editables en la herramienta.
const DEPS: Record<string, string[]> = {
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
};

const mile = (id: string, name: string, module: string, track: TrackKey, date: string): Task => ({
  id, name, detail: '', module, track, soft: false, start: date, end: date,
  owner: 'Dirección', status: 'todo', progress: 0, milestone: true, dependsOn: [],
});

export const buildSeed = (): Task[] => {
  const tasks: Task[] = PLAN.map(([module, name, s, e, track, soft], i) => ({
    id: 't' + i, module, name, detail: '', track, soft,
    start: monStart(s), end: monEnd(e),
    owner: ownerFor(track), status: SEEDSTATE[name]?.status || 'todo',
    progress: SEEDSTATE[name]?.progress || 0, milestone: false, dependsOn: [],
  }));
  tasks.push(mile('m1', '◆ Convención Comercial (Kick-off)', '1 · SMART · Activación temprana', 'S', '2026-09-08'));
  tasks.push(mile('m2', '◆ Tope SMART (cierre feb)', '2 · SMART · Cierre', 'S', '2027-02-28'));
  tasks.push(mile('m3', '◆ Auditoría de resultados', '7 · Medición y cierre auditado', 'T', '2027-09-15'));
  const idByName = Object.fromEntries(tasks.map((t) => [t.name, t.id]));
  tasks.forEach((t) => {
    const pre = DEPS[t.name];
    if (pre) t.dependsOn = pre.map((n) => idByName[n]).filter(Boolean);
  });
  return tasks;
};
