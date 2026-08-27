/**
 * Nuxt 4.2 dev: nitro crea `~payloadReducers` pero definePayloadReducer escribe en `_payloadReducers`.
 * Sin este alias, SSR falla con "Cannot set properties of undefined (setting 'NuxtError')".
 */
export default defineNuxtPlugin({
  name: 'coop:payload-reducers-alias',
  enforce: 'pre',
  setup() {
    const ctx = useNuxtApp().ssrContext as {
      _payloadReducers?: Record<string, (data: unknown) => unknown>
      '~payloadReducers'?: Record<string, (data: unknown) => unknown>
    } | undefined

    if (!ctx) {
      return
    }

    if (ctx._payloadReducers) {
      return
    }

    if (ctx['~payloadReducers']) {
      ctx._payloadReducers = ctx['~payloadReducers']
      return
    }

    const reducers = Object.create(null) as Record<string, (data: unknown) => unknown>
    ctx._payloadReducers = reducers
    ctx['~payloadReducers'] = reducers
  },
})
