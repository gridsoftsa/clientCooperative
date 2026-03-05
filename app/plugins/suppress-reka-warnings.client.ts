/**
 * Suprime el warning conocido de reka-ui/Radix con Select, Popover, etc.:
 * "Extraneous non-props attributes (style, dataAriaHidden, ariaHidden) were passed to component
 * but could not be automatically inherited because component renders fragment or text root nodes"
 *
 * Es un bug upstream en reka-ui (hideOthers aplica attrs a componentes con fragment root).
 * No afecta la funcionalidad. Ver: https://github.com/unovue/reka-ui/issues/1320
 */
export default defineNuxtPlugin(() => {
  if (import.meta.dev) {
    const app = useNuxtApp().vueApp
    const originalWarn = app.config.warnHandler
    app.config.warnHandler = (msg, instance, trace) => {
      if (
        typeof msg === 'string'
        && msg.includes('Extraneous non-props attributes')
        && msg.includes('could not be automatically inherited')
      ) {
        return
      }
      if (originalWarn) {
        originalWarn(msg, instance, trace)
      } else {
        console.warn(`[Vue warn]: ${msg}`)
      }
    }
  }
})
