# Client — Arquitectura del proyecto

Frontend SPA que consume la API Laravel. Autenticación stateful con Laravel Sanctum (cookies + CSRF). Pensado para desplegarse junto al backend en el mismo dominio o subdominio, con CORS y dominios stateful bien configurados.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Nuxt 4 |
| UI | Shadcn-Vue (componentes en `~/components/ui`) |
| Estilos | Tailwind CSS 4 |
| Estado | Pinia + `useState` (Nuxt) |
| Iconos | @nuxt/icon (lucide) |
| Validación de formularios | VeeValidate + Zod |
| Runtime | Node 22 (recomendado); pnpm como package manager |

---

## Estructura de directorios

El código de la aplicación vive bajo `app/` (`srcDir: app/`).

```
app/
├── assets/           # CSS global (p. ej. tailwind.css)
├── components/       # Componentes Vue (auto-importados)
│   └── ui/           # Componentes Shadcn-Vue
├── composables/      # Composables reutilizables (useAuth, usePermissions, etc.)
├── constants/        # Constantes (menús, temas, etc.)
├── layouts/          # Layouts (default, blank, etc.)
├── lib/              # Utilidades y datos compartidos (utils, JSON, etc.)
├── middleware/       # Middlewares de ruta (auth, roles, permisos)
├── pages/            # Páginas (file-based routing)
├── plugins/          # Plugins de Nuxt (API, SSR, etc.)
└── types/            # Definiciones TypeScript
```

- **Rutas**: Definidas por el filesystem en `pages/`. Rutas de error en `(error)/`, rutas de auth en `(auth)/` si aplica.
- **Configuración**: `nuxt.config.ts`; URL del backend en `runtimeConfig.public.apiBase` (env: `NUXT_PUBLIC_API_BASE`).
- **API**: Cliente HTTP (axios/fetch) configurado en un plugin para usar `apiBase`, credenciales y CSRF según Sanctum SPA.

---

## Convenciones de código

- **Componentes**: PascalCase (ej. `AuthGuard.vue`, `PermissionGate.vue`).
- **Composables**: camelCase con prefijo `use` (ej. `useAuth.ts`, `usePermissions.ts`).
- **Páginas**: kebab-case en la URL (ej. `admin/users/index.vue`).
- **Tipos**: PascalCase (ej. `AuthUser`, `NavLink`).
- **Imports**: Alias `~/` para rutas bajo `app/`. Componentes, composables y utils se auto-importan; no importar ref/computed si ya están auto-importados.
- **SSR**: Código solo servidor con `import.meta.server`; solo cliente con `import.meta.client` o `onMounted`. Contenido sensible a auth en `ClientOnly` o detrás de guards.

---

## Autenticación y autorización

- **Auth**: Sesión con cookies (Sanctum SPA). El composable de auth (p. ej. `useAuth`) gestiona login, logout y estado de usuario.
- **Rutas protegidas**: Middleware global o por ruta (auth, roles, permisos) que redirigen a login o a una página de no autorizado.
- **Permisos**: Sincronizados con la API (roles/permisos); composable (p. ej. `usePermissions`) y componentes (p. ej. `PermissionGate`) para mostrar/ocultar UI según permisos.

---

## Entorno y despliegue

- **Variable clave**: `NUXT_PUBLIC_API_BASE` (URL base de la API, usada en build y en runtime).
- **Docker**: Build multi-stage (Node 22): stage de build con pnpm/npm y `nuxt build`, stage de producción con `.output` y `node .output/server/index.mjs` (puerto 3000).
- **Orquestación**: El `docker-compose.yml` de este repo define los servicios (postgres, api, client). El client depende del servicio API y recibe `NUXT_PUBLIC_API_BASE` por variable de entorno.
- **Despliegue**: Desde la raíz del monorepo, `./clientCooperative/deploy.sh` hace build del client y `up -d client` (no se usa `down -v` para no borrar volúmenes).

---

## Comandos útiles

```bash
pnpm install   # o npm ci
pnpm run dev   # Servidor de desarrollo (puerto en nuxt.config, ej. 3535)
pnpm run build
pnpm run preview
```

---

Este README describe solo la **arquitectura** del proyecto para onboarding y para que una IA pueda entender la estructura, convenciones y stack sin depender de un listado de módulos o funcionalidades.
