# Despliegue Docker - Cooperativa

Stack: Laravel 12 (API) + Nuxt 4 (Cliente) + PostgreSQL 16

## Requisitos

- Docker y Docker Compose
- Git

## Despliegue en VPS

### 1. Estructura del proyecto

Se usa el **docker-compose del cliente**; el **.env de la API** va dentro de `apiCooperative/`:

```
cooperative/                    # carpeta raíz (o la que contenga ambos proyectos)
├── apiCooperative/
│   ├── .env                    # Variables de Laravel y credenciales PostgreSQL
│   └── ...
└── clientCooperative/
    ├── docker-compose.yml      # Compose que levanta todo (API, client, postgres)
    └── ...
```

### 2. Configurar variables de entorno

- **API:** editar `apiCooperative/.env` (credenciales DB, APP_KEY, APP_URL, etc.).
- Para que **Postgres** y los contenedores usen las mismas credenciales, crear también un `.env` en la **carpeta raíz** (donde ejecutas `docker compose`) con al menos:
  - `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` (mismos valores que en `apiCooperative/.env`).

**Importante para producción:**

- Generar `APP_KEY`: `php artisan key:generate` (o en `apiCooperative/.env`)
- `APP_URL` y `FRONTEND_URL` = URLs públicas
- `NUXT_PUBLIC_API_BASE` = URL pública de la API
- `SANCTUM_STATEFUL_DOMAINS` y `CORS_ALLOWED_ORIGINS` = dominio del frontend

### 3. Levantar servicios

Ejecutar desde la **carpeta raíz** (la que contiene `apiCooperative/` y `clientCooperative/`):

```bash
cd cooperative
docker compose -f clientCooperative/docker-compose.yml build --no-cache
docker compose -f clientCooperative/docker-compose.yml up -d
```

### 4. Generar APP_KEY (si no está en apiCooperative/.env)

```bash
docker compose -f clientCooperative/docker-compose.yml exec api php artisan key:generate
```

### 5. Ejecutar seeders (opcional)

```bash
docker compose -f clientCooperative/docker-compose.yml exec api php artisan db:seed
```

## Puertos

| Servicio   | Puerto | URL local             |
| ---------- | ------ | --------------------- |
| API        | 8585   | http://localhost:8585 |
| Cliente    | 3535   | http://localhost:3535 |
| PostgreSQL | 5435   | localhost:5435        |

## Comandos útiles

Usar siempre `-f clientCooperative/docker-compose.yml` desde la carpeta raíz:

```bash
# Ver logs
docker compose -f clientCooperative/docker-compose.yml logs -f

# Entrar al contenedor API
docker compose -f clientCooperative/docker-compose.yml exec api sh

# Migraciones
docker compose -f clientCooperative/docker-compose.yml exec api php artisan migrate

# Reiniciar
docker compose -f clientCooperative/docker-compose.yml down && docker compose -f clientCooperative/docker-compose.yml up -d
```

## Producción con dominio

Para usar un dominio (ej: `app.tudominio.com` y `api.tudominio.com`):

1. Configurar un reverse proxy (Nginx o Caddy) en el host
2. Proxy `api.tudominio.com` → `localhost:8585`
3. Proxy `app.tudominio.com` → `localhost:3535`
4. Ajustar `.env`:
   - `APP_URL=https://api.tudominio.com`
   - `FRONTEND_URL=https://app.tudominio.com`
   - `NUXT_PUBLIC_API_BASE=https://api.tudominio.com`
   - `SANCTUM_STATEFUL_DOMAINS=app.tudominio.com`
   - `CORS_ALLOWED_ORIGINS=https://app.tudominio.com`
