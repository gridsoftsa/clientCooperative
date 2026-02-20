# Desarrollo local (sin Docker para API y cliente)

En local corres la **API** y el **cliente** en tu máquina para tener recarga en vivo. La base de datos puede estar en Docker (recomendado) o instalada en el sistema.

---

## Resumen rápido

| Entorno | API | Cliente | Base de datos |
|--------|-----|---------|----------------|
| **Producción** (VPS) | Docker (imagen) | Docker (imagen) | Docker |
| **Desarrollo** (local) | `php artisan serve` / `composer run dev` | `pnpm dev` | Docker (solo Postgres) o local |

---

## 1. Requisitos en tu máquina

- **PHP 8.2+** (8.4 recomendado), Composer
- **Node 22** y **pnpm** (o npm)
- **Docker** (solo para Postgres, si usas la opción con Docker)

---

## 2. Base de datos (elegir una opción)

### Opción A: Postgres en Docker (recomendado)

Desde la carpeta raíz del proyecto (donde están `apiCooperative/` y `clientCooperative/`):

```bash
docker compose -f clientCooperative/docker-compose.dev.yml up -d
```

Eso levanta solo PostgreSQL en el puerto **5435**. Credenciales desde el `.env` de la raíz (o por defecto: usuario `cooperative`, contraseña `secret`, BD `cooperative`).

Para parar:

```bash
docker compose -f clientCooperative/docker-compose.dev.yml down
```

### Opción B: Postgres instalado en el sistema

Si ya tienes Postgres en tu máquina, crea la base y el usuario y usa en `apiCooperative/.env` el `DB_HOST`, `DB_PORT`, etc. que correspondan (por ejemplo `DB_HOST=127.0.0.1`, `DB_PORT=5432`).

---

## 3. Configurar .env para desarrollo

### 3.1 `apiCooperative/.env`

Que apunte a la BD y a URLs locales:

```env
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8585
FRONTEND_URL=http://localhost:3535

# Si usas Postgres en Docker (opción A)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5435
DB_DATABASE=cooperative
DB_USERNAME=cooperative
DB_PASSWORD=secret

# Sanctum / CORS para el front en local (puerto 3535)
SANCTUM_STATEFUL_DOMAINS=localhost:3535,127.0.0.1:3535
CORS_ALLOWED_ORIGINS=http://localhost:3535
```

Si usas Postgres local (opción B), cambia `DB_HOST` y `DB_PORT` según tu instalación.

### 3.2 Cliente Nuxt

El cliente usa por defecto `http://localhost:8000` como API (`nuxt.config.ts`). Si la API en local va en otro puerto (por ejemplo 8585), en `clientCooperative` puedes hacer:

Por defecto el frontend usa `http://localhost:8585` como API. Si necesitas cambiarlo, crea un `.env` en `clientCooperative/` con `NUXT_PUBLIC_API_BASE=http://localhost:8585`.

---

## 4. Instalar dependencias (primera vez)

```bash
# API
cd apiCooperative
composer install
cp .env.example .env   # si no tienes .env
php artisan key:generate
php artisan migrate
# (opcional) npm install && npm run build si usas Vite en la API

# Cliente
cd ../clientCooperative
pnpm install
```

---

## 5. Levantar API y cliente en desarrollo

Abre **dos terminales** en la raíz del proyecto.

**Terminal 1 – API:**

```bash
cd apiCooperative
composer run dev
```

Eso levanta el servidor Laravel en **http://localhost:8585**, cola, logs y Vite. Si solo quieres el servidor:

```bash
php artisan serve --port=8585
```

**Terminal 2 – Cliente:**

```bash
cd clientCooperative
pnpm dev
```

Frontend en **http://localhost:3535**.

---

## 6. URLs en desarrollo

| Servicio | URL |
|----------|-----|
| API | http://localhost:8585 |
| Cliente | http://localhost:3535 |
| Postgres (Docker) | localhost:5435 |

Abre el navegador en **http://localhost:3535** y el cliente consumirá la API en **http://localhost:8585**.

---

## 7. Cambiar entre desarrollo y producción (Docker)

- **Solo desarrollo local:** no uses el compose de producción. Usa solo `docker-compose.dev.yml` para Postgres (o nada si Postgres es local).
- **Probar el stack como en producción (local):**  
  `docker compose -f clientCooperative/docker-compose.yml up -d`  
  Eso levanta API + cliente + Postgres como en el VPS (sin recarga en vivo).

Resumen:
- **Dev:** Postgres en Docker (opcional) + `composer run dev` + `pnpm dev`.
- **Prod (local o VPS):** `docker compose -f clientCooperative/docker-compose.yml up -d`.
