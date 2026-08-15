export default defineNuxtPlugin(async () => {
  const { fetchBranding } = useCompanyBranding()

  try {
    await fetchBranding()
  } catch (error) {
    console.warn('No se pudo cargar la identidad visual de la empresa:', error)
  }
})
