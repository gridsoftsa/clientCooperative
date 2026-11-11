/**
 * applicant_trd: documentos maestros y cada crédito viven en la TRD del solicitante.
 * credit_link: vuelve a mostrar Enlace crédito. Debe coincidir con ARCHIVAL_CREDIT_STORAGE en la API.
 */
export const archivalCreditStorage = 'applicant_trd' as 'applicant_trd' | 'credit_link'

export const showCreditLinkMenu = archivalCreditStorage === 'credit_link'
