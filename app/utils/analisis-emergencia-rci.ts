/**
 * Riesgo asumido (RCI) — deudor.
 * = (Suma(cuotas entidades financieras) + Vr. cuota var.) / Total ingresos
 * (resultado en porcentaje 0–100+).
 * Los sumandos y el total se interpretan en el formulario con el mismo criterio que el resto de la hoja.
 */

/**
 * (suma cuotas + vr cuota var) / total ingresos → porcentaje, o `null` si el denominador no aplica.
 */
export function computeRiesgoAsumidoRciPercento(opts: {
  sumaCuotasEntidades: number
  vrCuotaVar: number
  totalIngresos: number
}): number | null {
  const { sumaCuotasEntidades, vrCuotaVar, totalIngresos } = opts
  if (!Number.isFinite(totalIngresos) || totalIngresos <= 0) {
    return null
  }
  const num = sumaCuotasEntidades + vrCuotaVar
  if (!Number.isFinite(num)) {
    return null
  }
  return (num / totalIngresos) * 100
}

/**
 * Criterio Excel (anidado SI) adaptado a tramos contiguos sin huecos:
 * ≤40 % Bajo; (40, 50] Medio; (50, 60] Alto; &gt;60 % Muy Alto.
 */
export type NivelRiesgoAsumidoRci = 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto'

export function classifyNivelRiesgoAsumidoRci(percent: number): NivelRiesgoAsumidoRci {
  if (percent <= 40) {
    return 'Bajo'
  }
  if (percent > 40 && percent <= 50) {
    return 'Medio'
  }
  if (percent > 50 && percent <= 60) {
    return 'Alto'
  }
  return 'Muy Alto'
}

/** Texto fijo para ayuda (coincide con tramos de `classifyNivelRiesgoAsumidoRci`). */
export const AYUDA_NIVEL_RCI_TRAMOS
  = 'Nivel: ≤ 40 % Bajo; 40,01–50 % Medio; 50,01–60 % Alto; > 60 % Muy Alto. Menor RCI = mejor.'

/**
 * Caja de «Nivel del riesgo asumido (RCI)» — más bajo es mejor: Bajo=verde … Muy Alto=rojo.
 * Paralelo a `nivelRiesgoTailwindClasses` (SCORE) pero con cuatro tramos.
 */
export function rciNivelRiesgoBloqueClasses(n: NivelRiesgoAsumidoRci): string {
  switch (n) {
    case 'Bajo':
      return 'border-emerald-300/80 bg-emerald-500/10 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-100'
    case 'Medio':
      return 'border-amber-300/80 bg-amber-500/10 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100'
    case 'Alto':
      return 'border-orange-300/80 bg-orange-500/12 text-orange-950 dark:border-orange-500/45 dark:bg-orange-950/30 dark:text-orange-100'
    case 'Muy Alto':
      return 'border-red-300/80 bg-red-500/10 text-red-950 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-100'
  }
}

/**
 * Contenedor del bloque RCI: mismo criterio cromático que el nivel (riesgo bajo = tono verdoso).
 */
export function rciResumenContenedorClasses(n: NivelRiesgoAsumidoRci | null | undefined): string {
  if (n == null) {
    return 'border-border/60 bg-muted/20 text-foreground'
  }
  return rciNivelRiesgoBloqueClasses(n)
}

export function formatRiesgoAsumidoRciPorcentajeVista(percent: number): string {
  const r = Math.round(percent * 100) / 100
  return `${r.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
}
