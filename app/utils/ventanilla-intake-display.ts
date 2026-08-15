export function ventanillaIntakeSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    web_form: 'Formulario web',
    email: 'Correo electrónico',
  }

  return labels[source] ?? source
}

export function ventanillaIntakeStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_classification: 'Pendiente',
    classified: 'Clasificada',
    discarded: 'Descartada',
  }

  return labels[status] ?? status
}

export function ventanillaIntakeReceiptCode(intakeId: number): string {
  return `ENT-${intakeId}`
}

export function formatVentanillaIntakeDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString('es-CO') : '—'
}
