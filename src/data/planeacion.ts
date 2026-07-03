// Módulo de planeación de servicios académicos (hojas de asesores).
// Capa operativa bajo el Simulador: ver docs/05-planeacion-servicios.md.
// Este archivo es lógica pura (sin React ni Supabase) para poder testearla.
import { DEFAULTS } from './model';
import type { Tier, TierKey, Campaign } from './model';

export type Estatus = 'pendiente' | 'agendado' | 'realizado';
export type ServTipo = 'uso' | 'prof' | 'didac';

export const ESTATUS: Estatus[] = ['pendiente', 'agendado', 'realizado'];
export const SERV_LABEL: Record<ServTipo, string> = { uso: 'Uso', prof: 'Profundización', didac: 'Didáctica' };

export interface Servicio {
  tipo: ServTipo;
  estatus: Estatus;
  fechaPlan?: string;   // ISO 'YYYY-MM-DD'
  fechaReal?: string;
  nota?: string;
}

export interface Colegio {
  id: string;                // estable → clave para carga CSV futura
  nombre: string;            // editable; el CSV lo sobreescribe
  campaign: Campaign;
  tier: TierKey;
  asesorId: string | null;   // null = sin asignar (lo cubren externos)
  servicios: Servicio[];     // congelados al generar
}

export interface Asesor { id: string; nombre: string; }

export interface PlaneacionData {
  asesores: Asesor[];
  colegios: Colegio[];
}

/** Servicios requeridos de un colegio, derivados de la matriz del tipo (Simulador). */
export function serviciosDeTier(tier: Tier): Servicio[] {
  const out: Servicio[] = [];
  const add = (tipo: ServTipo, count: number) => {
    for (let i = 0; i < Math.round(count); i++) out.push({ tipo, estatus: 'pendiente' });
  };
  add('uso', tier.uso); add('prof', tier.prof); add('didac', tier.didac);
  return out;
}

/** # de colegios de un tipo en una campaña: total × (mezcla del tipo / Σ mezcla). */
export function nColegios(vTotal: number, tier: Tier, tiers: Tier[]): number {
  const sumPct = tiers.reduce((s, t) => s + t.pct, 0) || 1;
  return Math.round(vTotal * (tier.pct / sumPct));
}

/** Genera los cupos anónimos de ambas campañas con sus servicios congelados. */
export function generateColegios(vSmart: number, tiersSmart: Tier[], vCore: number, tiersCore: Tier[]): Colegio[] {
  const out: Colegio[] = [];
  const gen = (camp: Campaign, vTotal: number, tiers: Tier[]) => {
    for (const t of tiers) {
      const count = nColegios(vTotal, t, tiers);
      for (let i = 1; i <= count; i++) {
        const id = `${camp}-${t.key}-${String(i).padStart(3, '0')}`;
        out.push({ id, nombre: id, campaign: camp, tier: t.key, asesorId: null, servicios: serviciosDeTier(t) });
      }
    }
  };
  gen('SMART', vSmart, tiersSmart);
  gen('CORE', vCore, tiersCore);
  return out;
}

export function defaultAsesores(nAse: number): Asesor[] {
  return Array.from({ length: Math.max(0, Math.round(nAse)) }, (_, i) => ({ id: `ase-${i + 1}`, nombre: `Asesor ${i + 1}` }));
}

/** Tablero inicial derivado de las semillas del Simulador (DEFAULTS). */
export function defaultPlaneacion(): PlaneacionData {
  return {
    asesores: defaultAsesores(DEFAULTS.nAse),
    colegios: generateColegios(DEFAULTS.vSmart, DEFAULTS.tiersSmart, DEFAULTS.vCore, DEFAULTS.tiersCore),
  };
}

/** Asigna (o quita, con asesorId=null) un conjunto de colegios; devuelve un arreglo nuevo. */
export function asignar(colegios: Colegio[], ids: Set<string>, asesorId: string | null): Colegio[] {
  return colegios.map((c) => (ids.has(c.id) ? { ...c, asesorId } : c));
}

export interface Resumen { total: number; asignados: number; sinAsignar: number; }
export function resumen(colegios: Colegio[]): Resumen {
  const asignados = colegios.reduce((s, c) => s + (c.asesorId ? 1 : 0), 0);
  return { total: colegios.length, asignados, sinAsignar: colegios.length - asignados };
}

/** Asigna a `asesorId` los primeros `count` cupos SIN asignar de (campaña, tipo). */
export function asignarPorTipo(colegios: Colegio[], campaign: Campaign, tier: TierKey, count: number, asesorId: string): Colegio[] {
  const ids = new Set<string>();
  for (const c of colegios) {
    if (ids.size >= count) break;
    if (c.campaign === campaign && c.tier === tier && c.asesorId === null) ids.add(c.id);
  }
  return asignar(colegios, ids, asesorId);
}

/** Libera (deja sin asignar) los primeros `count` cupos de (campaña, tipo) que tenga `asesorId`. */
export function liberarPorTipo(colegios: Colegio[], campaign: Campaign, tier: TierKey, count: number, asesorId: string): Colegio[] {
  const ids = new Set<string>();
  for (const c of colegios) {
    if (ids.size >= count) break;
    if (c.campaign === campaign && c.tier === tier && c.asesorId === asesorId) ids.add(c.id);
  }
  return asignar(colegios, ids, null);
}

/** Cuenta cupos por (campaña, tipo). Con `asesorId` undefined cuenta los SIN asignar. */
export function contarPorTipo(colegios: Colegio[], campaign: Campaign, tier: TierKey, asesorId?: string | null): number {
  return colegios.reduce((s, c) => {
    if (c.campaign !== campaign || c.tier !== tier) return s;
    if (asesorId === undefined) return s + (c.asesorId === null ? 1 : 0);
    return s + (c.asesorId === asesorId ? 1 : 0);
  }, 0);
}

/** Actualiza un servicio (por índice) de un colegio; devuelve un arreglo nuevo (inmutable). */
export function setServicio(colegios: Colegio[], colegioId: string, idx: number, patch: Partial<Servicio>): Colegio[] {
  return colegios.map((c) => c.id !== colegioId ? c
    : { ...c, servicios: c.servicios.map((s, i) => i === idx ? { ...s, ...patch } : s) });
}

/** Renombra un colegio (útil antes de la carga CSV con nombres reales). */
export function renombrarColegio(colegios: Colegio[], id: string, nombre: string): Colegio[] {
  return colegios.map((c) => c.id === id ? { ...c, nombre } : c);
}

export interface Carga { colegios: number; servicios: number; realizados: number; usoProf: number; }
export function cargaAsesor(colegios: Colegio[], asesorId: string): Carga {
  let cols = 0, servicios = 0, realizados = 0, usoProf = 0;
  for (const c of colegios) {
    if (c.asesorId !== asesorId) continue;
    cols++;
    for (const s of c.servicios) {
      servicios++;
      if (s.estatus === 'realizado') realizados++;
      if (s.tipo !== 'didac') usoProf++;   // didácticas las hacen externos aunque el colegio esté asignado
    }
  }
  return { colegios: cols, servicios, realizados, usoProf };
}

// ---- Agenda / urgencia (usabilidad de la hoja del asesor) ----

/** Fecha local de hoy en ISO 'YYYY-MM-DD'. */
export function hoyISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Suma días a una fecha ISO (aritmética en UTC para no saltar por horario de verano). */
export function sumarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export type Urgencia = 'realizado' | 'vencido' | 'proximo' | 'agendado' | 'sinfecha';
/** Clasifica un servicio para resaltarlo: vencido (fecha planeada pasada sin hacer), próximo (≤7 días), etc. */
export function urgencia(s: Servicio, hoy: string): Urgencia {
  if (s.estatus === 'realizado') return 'realizado';
  if (!s.fechaPlan) return 'sinfecha';
  if (s.fechaPlan < hoy) return 'vencido';
  if (s.fechaPlan <= sumarDias(hoy, 7)) return 'proximo';
  return 'agendado';
}

export interface AgendaResumen { vencidos: number; estaSemana: number; porHacer: number; }
export function agendaAsesor(colegios: Colegio[], asesorId: string, hoy: string): AgendaResumen {
  let vencidos = 0, estaSemana = 0, porHacer = 0;
  for (const c of colegios) {
    if (c.asesorId !== asesorId) continue;
    for (const s of c.servicios) {
      if (s.estatus === 'realizado') continue;
      porHacer++;
      const u = urgencia(s, hoy);
      if (u === 'vencido') vencidos++;
      else if (u === 'proximo') estaSemana++;
    }
  }
  return { vencidos, estaSemana, porHacer };
}

export interface ServicioRef { colegioId: string; colegioNombre: string; campaign: Campaign; tier: TierKey; idx: number; servicio: Servicio; }
/** Aplana los servicios de un asesor (para la vista agenda). */
export function serviciosDeAsesor(colegios: Colegio[], asesorId: string): ServicioRef[] {
  const out: ServicioRef[] = [];
  for (const c of colegios) {
    if (c.asesorId !== asesorId) continue;
    c.servicios.forEach((servicio, idx) => out.push({ colegioId: c.id, colegioNombre: c.nombre, campaign: c.campaign, tier: c.tier, idx, servicio }));
  }
  return out;
}

export interface Avance { colegios: number; servicios: number; realizados: number; usoProf: number; didac: number; }
/** Avance agregado sobre los colegios ASIGNADOS (lo que ejecutan los empleados). */
export function avanceAsignado(colegios: Colegio[]): Avance {
  let cols = 0, servicios = 0, realizados = 0, usoProf = 0, didac = 0;
  for (const c of colegios) {
    if (!c.asesorId) continue;
    cols++;
    for (const s of c.servicios) {
      servicios++;
      if (s.estatus === 'realizado') realizados++;
      if (s.tipo === 'didac') didac++; else usoProf++;
    }
  }
  return { colegios: cols, servicios, realizados, usoProf, didac };
}
