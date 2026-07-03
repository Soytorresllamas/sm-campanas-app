import { describe, expect, it } from 'vitest';
import { DEFAULTS } from './model';
import {
  serviciosDeTier, nColegios, generateColegios, defaultAsesores, defaultPlaneacion,
  asignar, resumen, cargaAsesor, asignarPorTipo, liberarPorTipo, contarPorTipo,
  setServicio, renombrarColegio, avanceAsignado,
  hoyISO, sumarDias, urgencia, agendaAsesor, serviciosDeAsesor,
} from './planeacion';
import type { Servicio } from './planeacion';

const tierTop = { key: 'top' as const, label: 'Top', pct: 10, uso: 3, prof: 2, didac: 1 };

describe('serviciosDeTier', () => {
  it('crea una instancia por servicio requerido, todas pendientes', () => {
    const s = serviciosDeTier(tierTop);
    expect(s).toHaveLength(6); // 3 uso + 2 prof + 1 didac
    expect(s.filter((x) => x.tipo === 'uso')).toHaveLength(3);
    expect(s.filter((x) => x.tipo === 'prof')).toHaveLength(2);
    expect(s.filter((x) => x.tipo === 'didac')).toHaveLength(1);
    expect(s.every((x) => x.estatus === 'pendiente')).toBe(true);
  });

  it('un tipo con 0 didácticas no crea servicios de ese tipo', () => {
    const bajo = { key: 'bajo' as const, label: 'Bajo', pct: 25, uso: 1, prof: 1, didac: 0 };
    expect(serviciosDeTier(bajo).filter((x) => x.tipo === 'didac')).toHaveLength(0);
  });
});

describe('nColegios', () => {
  it('= total × mezcla / Σ mezcla (redondeado)', () => {
    expect(nColegios(321, DEFAULTS.tiersSmart[0], DEFAULTS.tiersSmart)).toBe(Math.round(321 * 0.10)); // Top 10% → 32
    expect(nColegios(1047, DEFAULTS.tiersCore[1], DEFAULTS.tiersCore)).toBe(Math.round(1047 * 0.25)); // Alto 25% → 262
  });
});

describe('generateColegios', () => {
  const cols = generateColegios(DEFAULTS.vSmart, DEFAULTS.tiersSmart, DEFAULTS.vCore, DEFAULTS.tiersCore);

  it('genera ambas campañas con ids únicos y estables', () => {
    expect(cols.length).toBeGreaterThan(0);
    const ids = new Set(cols.map((c) => c.id));
    expect(ids.size).toBe(cols.length); // sin duplicados
    expect(cols.some((c) => c.campaign === 'SMART')).toBe(true);
    expect(cols.some((c) => c.campaign === 'CORE')).toBe(true);
  });

  it('todos arrancan sin asignar y con servicios pendientes', () => {
    expect(cols.every((c) => c.asesorId === null)).toBe(true);
    expect(cols.every((c) => c.servicios.every((s) => s.estatus === 'pendiente'))).toBe(true);
  });

  it('el # de cupos por tipo coincide con nColegios', () => {
    const smTop = cols.filter((c) => c.campaign === 'SMART' && c.tier === 'top');
    expect(smTop).toHaveLength(nColegios(DEFAULTS.vSmart, DEFAULTS.tiersSmart[0], DEFAULTS.tiersSmart));
    // cada cupo Top trae la matriz del tipo (3+2+1 = 6 servicios)
    expect(smTop[0].servicios).toHaveLength(6);
  });
});

describe('defaultAsesores / defaultPlaneacion', () => {
  it('crea nAse asesores con ids únicos', () => {
    const a = defaultAsesores(DEFAULTS.nAse);
    expect(a).toHaveLength(DEFAULTS.nAse);
    expect(new Set(a.map((x) => x.id)).size).toBe(DEFAULTS.nAse);
  });

  it('el tablero por defecto trae asesores y cupos', () => {
    const d = defaultPlaneacion();
    expect(d.asesores.length).toBe(DEFAULTS.nAse);
    expect(d.colegios.length).toBeGreaterThan(0);
  });
});

describe('asignar / resumen / cargaAsesor', () => {
  it('asignar cambia solo los colegios seleccionados (inmutable)', () => {
    const cols = generateColegios(DEFAULTS.vSmart, DEFAULTS.tiersSmart, DEFAULTS.vCore, DEFAULTS.tiersCore);
    const ids = new Set([cols[0].id, cols[1].id]);
    const next = asignar(cols, ids, 'ase-1');
    expect(next[0].asesorId).toBe('ase-1');
    expect(next[1].asesorId).toBe('ase-1');
    expect(next[2].asesorId).toBe(null);
    expect(cols[0].asesorId).toBe(null); // no muta el original
  });

  it('quitar asignación con asesorId=null', () => {
    // vSmart=10 → Top redondea a 1 colegio: existe 'SMART-top-001'
    const cols = asignar(generateColegios(10, DEFAULTS.tiersSmart, 0, DEFAULTS.tiersCore), new Set(['SMART-top-001']), 'ase-1');
    expect(cols.find((c) => c.id === 'SMART-top-001')?.asesorId).toBe('ase-1');
    const back = asignar(cols, new Set(['SMART-top-001']), null);
    expect(back.find((c) => c.id === 'SMART-top-001')?.asesorId).toBe(null);
  });

  it('resumen cuenta asignados y sin asignar', () => {
    const cols = generateColegios(DEFAULTS.vSmart, DEFAULTS.tiersSmart, 0, DEFAULTS.tiersCore);
    const r0 = resumen(cols);
    expect(r0.asignados).toBe(0);
    expect(r0.sinAsignar).toBe(r0.total);
    const asignados = asignar(cols, new Set([cols[0].id, cols[1].id]), 'ase-1');
    const r1 = resumen(asignados);
    expect(r1.asignados).toBe(2);
    expect(r1.total).toBe(r0.total);
  });

  it('asignarPorTipo toma los primeros N sin asignar de ese tipo; liberarPorTipo los suelta', () => {
    let cols = generateColegios(DEFAULTS.vSmart, DEFAULTS.tiersSmart, DEFAULTS.vCore, DEFAULTS.tiersCore);
    const disp0 = contarPorTipo(cols, 'SMART', 'alto');
    expect(disp0).toBeGreaterThan(5);
    cols = asignarPorTipo(cols, 'SMART', 'alto', 5, 'ase-1');
    expect(contarPorTipo(cols, 'SMART', 'alto', 'ase-1')).toBe(5);       // 5 al asesor
    expect(contarPorTipo(cols, 'SMART', 'alto')).toBe(disp0 - 5);        // 5 menos disponibles
    // no invade otros tipos ni campañas
    expect(contarPorTipo(cols, 'CORE', 'alto', 'ase-1')).toBe(0);
    cols = liberarPorTipo(cols, 'SMART', 'alto', 2, 'ase-1');
    expect(contarPorTipo(cols, 'SMART', 'alto', 'ase-1')).toBe(3);
    expect(contarPorTipo(cols, 'SMART', 'alto')).toBe(disp0 - 3);
  });

  it('asignarPorTipo nunca asigna más que los disponibles', () => {
    let cols = generateColegios(10, DEFAULTS.tiersSmart, 0, DEFAULTS.tiersCore);
    const disp = contarPorTipo(cols, 'SMART', 'top');  // 1 disponible
    cols = asignarPorTipo(cols, 'SMART', 'top', 99, 'ase-1');
    expect(contarPorTipo(cols, 'SMART', 'top', 'ase-1')).toBe(disp);
    expect(contarPorTipo(cols, 'SMART', 'top')).toBe(0);
  });

  it('cargaAsesor suma colegios, servicios y realizados del asesor', () => {
    let cols = generateColegios(DEFAULTS.vSmart, DEFAULTS.tiersSmart, 0, DEFAULTS.tiersCore);
    const top = cols.find((c) => c.tier === 'top')!;
    cols = asignar(cols, new Set([top.id]), 'ase-1');
    // marca un servicio como realizado
    cols = cols.map((c) => c.id === top.id ? { ...c, servicios: c.servicios.map((s, i) => i === 0 ? { ...s, estatus: 'realizado' as const } : s) } : c);
    const carga = cargaAsesor(cols, 'ase-1');
    expect(carga.colegios).toBe(1);
    expect(carga.servicios).toBe(6);   // Top = 6 servicios
    expect(carga.usoProf).toBe(5);     // 3 uso + 2 prof (didáctica no cuenta como empleado)
    expect(carga.realizados).toBe(1);
    // otro asesor no tiene nada
    expect(cargaAsesor(cols, 'ase-2').colegios).toBe(0);
  });
});

describe('agenda / urgencia', () => {
  const hoy = '2026-10-15';
  const S = (o: Partial<Servicio>): Servicio => ({ tipo: 'uso', estatus: 'pendiente', ...o });

  it('hoyISO formatea la fecha local como YYYY-MM-DD', () => {
    expect(hoyISO(new Date(2026, 9, 5))).toBe('2026-10-05'); // mes 9 = octubre
  });

  it('sumarDias suma cruzando mes y año', () => {
    expect(sumarDias('2026-10-15', 7)).toBe('2026-10-22');
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('urgencia clasifica según fecha planeada y estatus', () => {
    expect(urgencia(S({ estatus: 'realizado', fechaPlan: '2026-01-01' }), hoy)).toBe('realizado');
    expect(urgencia(S({}), hoy)).toBe('sinfecha');
    expect(urgencia(S({ fechaPlan: '2026-10-10' }), hoy)).toBe('vencido');
    expect(urgencia(S({ fechaPlan: '2026-10-18' }), hoy)).toBe('proximo');
    expect(urgencia(S({ fechaPlan: '2026-12-01' }), hoy)).toBe('agendado');
  });

  it('agendaAsesor cuenta vencidos, esta semana y por hacer (ignora realizados)', () => {
    let cols = generateColegios(10, DEFAULTS.tiersSmart, 0, DEFAULTS.tiersCore);
    const id = cols.find((c) => c.tier === 'top')!.id;
    cols = asignar(cols, new Set([id]), 'ase-1');
    cols = setServicio(cols, id, 0, { fechaPlan: '2026-10-10' }); // vencido
    cols = setServicio(cols, id, 1, { fechaPlan: '2026-10-18' }); // esta semana
    cols = setServicio(cols, id, 2, { estatus: 'realizado' });    // no cuenta
    const a = agendaAsesor(cols, 'ase-1', hoy);
    expect(a.vencidos).toBe(1);
    expect(a.estaSemana).toBe(1);
    expect(a.porHacer).toBe(5); // 6 servicios − 1 realizado
  });

  it('serviciosDeAsesor aplana solo los servicios del asesor', () => {
    let cols = generateColegios(10, DEFAULTS.tiersSmart, 0, DEFAULTS.tiersCore);
    const id = cols.find((c) => c.tier === 'top')!.id;
    cols = asignar(cols, new Set([id]), 'ase-1');
    const refs = serviciosDeAsesor(cols, 'ase-1');
    expect(refs).toHaveLength(6);
    expect(refs.every((r) => r.colegioId === id)).toBe(true);
    expect(serviciosDeAsesor(cols, 'ase-2')).toHaveLength(0);
  });
});

describe('avanceAsignado', () => {
  it('solo cuenta colegios asignados y separa uso/prof de didácticas', () => {
    let cols = generateColegios(DEFAULTS.vSmart, DEFAULTS.tiersSmart, DEFAULTS.vCore, DEFAULTS.tiersCore);
    expect(avanceAsignado(cols).colegios).toBe(0); // nada asignado aún
    cols = asignarPorTipo(cols, 'SMART', 'top', 2, 'ase-1'); // 2 Top = 2×(3u+2p+1d)
    const av = avanceAsignado(cols);
    expect(av.colegios).toBe(2);
    expect(av.servicios).toBe(12);
    expect(av.usoProf).toBe(10);   // 2×5
    expect(av.didac).toBe(2);      // 2×1
    expect(av.realizados).toBe(0);
    // marcar un servicio realizado se refleja
    const top = cols.find((c) => c.asesorId === 'ase-1')!;
    cols = setServicio(cols, top.id, 0, { estatus: 'realizado' });
    expect(avanceAsignado(cols).realizados).toBe(1);
  });
});

describe('setServicio / renombrarColegio', () => {
  const base = () => generateColegios(10, DEFAULTS.tiersSmart, 0, DEFAULTS.tiersCore);

  it('setServicio cambia solo el servicio indicado, sin mutar el original', () => {
    const cols = base();
    const id = cols.find((c) => c.tier === 'top')!.id;
    const next = setServicio(cols, id, 0, { estatus: 'realizado', fechaReal: '2026-10-05' });
    const c = next.find((x) => x.id === id)!;
    expect(c.servicios[0].estatus).toBe('realizado');
    expect(c.servicios[0].fechaReal).toBe('2026-10-05');
    expect(c.servicios[1].estatus).toBe('pendiente');           // otros servicios intactos
    expect(cols.find((x) => x.id === id)!.servicios[0].estatus).toBe('pendiente'); // original sin mutar
  });

  it('renombrarColegio cambia el nombre del colegio indicado', () => {
    const cols = base();
    const id = cols[0].id;
    const next = renombrarColegio(cols, id, 'Colegio Real X');
    expect(next.find((c) => c.id === id)!.nombre).toBe('Colegio Real X');
    expect(cols[0].nombre).toBe(id);   // original sin mutar
  });
});
