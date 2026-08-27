import type { FlatCatalogOption } from '~/composables/useTemplateFlatCatalogOptions'

/** Alineados con `database/seeders/data/radicacion_occupation_job_position_credit_destination_catalogs.php` (offline / error API). */
export const RADICACION_OCCUPATION_OPTIONS_FALLBACK: FlatCatalogOption[] = [
  { value: 'merchant', label: 'Comerciante' },
  { value: 'employee_private', label: 'Empleado sector privado' },
  { value: 'employee_public', label: 'Empleado sector público' },
  { value: 'independent_professional', label: 'Profesional independiente' },
  { value: 'farmer_rancher', label: 'Agricultor / ganadero' },
  { value: 'domestic_service', label: 'Servicio doméstico' },
  { value: 'retired', label: 'Pensionado / jubilado' },
  { value: 'student', label: 'Estudiante' },
  { value: 'homemaker', label: 'Ama de casa' },
  { value: 'transport_operator', label: 'Transportador / conductor' },
  { value: 'unemployed', label: 'Sin ocupación declarada' },
  { value: 'other', label: 'Otra ocupación' },
]

export const RADICACION_JOB_POSITION_OPTIONS_FALLBACK: FlatCatalogOption[] = [
  { value: 'owner', label: 'Propietario / dueño' },
  { value: 'manager', label: 'Gerente / administrador' },
  { value: 'administrative', label: 'Personal administrativo' },
  { value: 'sales', label: 'Ventas / comercial' },
  { value: 'operator_technician', label: 'Operario / técnico' },
  { value: 'professional_staff', label: 'Profesional de apoyo' },
  { value: 'director_coordinator', label: 'Director / coordinador' },
  { value: 'assistant', label: 'Auxiliar / asistente' },
  { value: 'not_applicable', label: 'No aplica' },
  { value: 'other_position', label: 'Otro cargo' },
]

export const RADICACION_CREDIT_DESTINATION_OPTIONS_FALLBACK: FlatCatalogOption[] = [
  { value: 'working_capital', label: 'Capital de trabajo' },
  { value: 'fixed_investment', label: 'Inversión fija (activos / equipos)' },
  { value: 'housing', label: 'Vivienda' },
  { value: 'debt_restructuring', label: 'Reestructuración de pasivos' },
  { value: 'agricultural_production', label: 'Producción agropecuaria' },
  { value: 'services_operations', label: 'Operación de servicios' },
  { value: 'vehicle', label: 'Vehículo' },
  { value: 'education_health', label: 'Educación / salud' },
  { value: 'other', label: 'Otro destino' },
]
