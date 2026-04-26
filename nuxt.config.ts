import tailwindcss from '@tailwindcss/vite'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true, componentInspector: false }, // componentInspector: false evita overlay que bloquea clicks

  css: ['~/assets/css/tailwind.css'],
  vite: {
    // @ts-expect-error Vite 6 / Rollup: tailwind `Plugin` type differs from Nuxt’s `PluginOption`
    plugins: [tailwindcss()],
  },

  components: [
    {
      path: '~/components',
      extensions: ['.vue'],
    },
  ],

  modules: [
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    // '@nuxtjs/i18n', // Temporalmente deshabilitado hasta resolver conflicto de versiones
    '@nuxt/fonts',
  ],

  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "~/components/ui"
     */
    componentDir: '~/components/ui',
  },

  colorMode: {
    classSuffix: '',
  },

  eslint: {
    config: {
      standalone: false,
    },
  },

  fonts: {
    defaults: {
      weights: [300, 400, 500, 600, 700, 800],
    },
  },

  routeRules: {
    '/components': { redirect: '/components/accordion' },
    '/settings': { redirect: '/settings/profile' },
    // Permisos no se administra en UI (asignación vía roles; definición en API/código)
    '/settings/permissions': { redirect: '/settings/roles' },
    '/settings/permissions/**': { redirect: '/settings/roles' },
  },

  imports: {
    dirs: [
      './lib',
    ],
  },

  compatibilityDate: '2024-12-14',

  devServer: {
    port: 3535,
  },

  runtimeConfig: {
    public: {
      // Laravel base URL (Sanctum SPA / cookies)
      apiBase: (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NUXT_PUBLIC_API_BASE || 'http://localhost:8585'
    }
  },

  // i18n: {
  //   locales: [
  //     { code: 'es', iso: 'es-ES', name: 'Español' },
  //     { code: 'en', iso: 'en-US', name: 'English' },
  //   ],
  //   defaultLocale: 'es',
  //   strategy: 'no_prefix',
  //   vueI18n: './app/i18n.config.ts',
  //   compilation: {
  //     strictMessage: false,
  //   },
  // },
})
