export interface TrdSpreadsheetGlossarySection {
  title: string
  items: Array<{ term: string, definition: string }>
}

export interface TrdSpreadsheetGlossaryContext {
  producerOfficeCode: string
  producerOfficeName: string
  orgUnitName?: string | null
  orgUnitCode?: string | null
}

export function buildTrdSpreadsheetGlossarySections(
  context: TrdSpreadsheetGlossaryContext,
): TrdSpreadsheetGlossarySection[] {
  const orgUnitLine = context.orgUnitName
    ? `${context.orgUnitName}${context.orgUnitCode ? ` (${context.orgUnitCode})` : ''}`
    : '—'

  return [
    {
      title: 'Identificación oficina productora',
      items: [
        { term: 'Cód. dependencia', definition: context.producerOfficeCode || '—' },
        { term: 'Oficina productora', definition: context.producerOfficeName || '—' },
        { term: 'Área productora', definition: orgUnitLine },
      ],
    },
    {
      title: 'Retención (años)',
      items: [
        {
          term: 'AG',
          definition: 'Archivo de gestión: años de permanencia en la dependencia productora.',
        },
        {
          term: 'AC',
          definition: 'Archivo central: años adicionales en archivo central institucional.',
        },
        {
          term: 'AH',
          definition: 'Archivo histórico: años en archivo histórico, cuando aplique.',
        },
      ],
    },
    {
      title: 'Disposición final',
      items: [
        { term: 'C', definition: 'Conservación total — marque X cuando corresponda.' },
        { term: 'S', definition: 'Selección documental — marque X cuando corresponda.' },
        { term: 'E', definition: 'Eliminación documental — marque X cuando corresponda.' },
        { term: 'D', definition: 'Digitalización / microfilmación — marque X cuando corresponda.' },
      ],
    },
    {
      title: 'Otros campos',
      items: [
        {
          term: 'Soporte',
          definition: 'Medio del documento: Papel, Digital o ambos.',
        },
        {
          term: 'Procedimiento',
          definition: 'Instrucciones para transferencia, conservación o eliminación.',
        },
      ],
    },
  ]
}

export function buildTrdSpreadsheetGlossaryPlainText(context: TrdSpreadsheetGlossaryContext): string {
  const lines: string[] = ['GLOSARIO']

  for (const section of buildTrdSpreadsheetGlossarySections(context)) {
    lines.push('')
    lines.push(section.title.toUpperCase())
    for (const item of section.items) {
      lines.push(`${item.term}: ${item.definition}`)
    }
  }

  return lines.join('\n')
}
