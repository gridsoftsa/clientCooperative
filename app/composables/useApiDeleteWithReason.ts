/**
 * DELETE al API con cuerpo JSON { reason } (requerido en backend).
 */
export function useApiDeleteWithReason() {
  const { $api } = useNuxtApp()
  return (path: string, reason: string) => {
    return $api(path, {
      method: 'DELETE',
      body: { reason: reason.trim() },
    })
  }
}
