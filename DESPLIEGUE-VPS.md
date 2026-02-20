# Despliegue en VPS (apicooperative + cooperative)

Dominios:

- **API:** apicooperative.tecnologicaslf.com → Laravel
- **Frontend:** cooperative.tecnologicaslf.com → Nuxt

En el VPS usarás **Docker** para la app y **Nginx** en el host como reverse proxy (y SSL con Certbot).

---

## 1. Requisitos del VPS

- Ubuntu 22.04 o 24.04 (o Debian 11/12)
- Acceso root o sudo
- DNS: que **apicooperative.tecnologicaslf.com** y **cooperative.tecnologicaslf.com** apunten al **IP del VPS** (registros A)

---

## 2. Instalar Docker (si no lo tienes)

```bash
# Actualizar e instalar dependencias
sudo apt update && sudo apt install -y ca-certificates curl

# Añadir clave y repo de Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker y Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Usuario actual pueda usar Docker (opcional)
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para que aplique
```

---

## 3. Subir el proyecto al VPS

Desde tu máquina (o desde el VPS si clonas por git):

```bash
# Opción A: clonar por git
cd /opt  # o donde quieras
sudo git clone https://tu-repo/cooperative.git
cd cooperative

# Opción B: subir con rsync desde tu PC
# rsync -avz --exclude node_modules --exclude vendor ./cooperative usuario@IP_VPS:/opt/cooperative
```

Estructura esperada en el VPS:

```
/opt/cooperative/
├── apiCooperative/
│   └── .env          # con credenciales y URLs de producción
├── clientCooperative/
│   ├── docker-compose.yml
│   └── vps-nginx/    # configs de Nginx
└── .env              # opcional: DB_* para Postgres (si usas compose desde aquí)
```

---

## 4. Configurar variables de entorno (producción)

### 4.1 `apiCooperative/.env`

Edita en el VPS:

```bash
nano /opt/cooperative/apiCooperative/.env
```

Ajusta al menos:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://apicooperative.tecnologicaslf.com
FRONTEND_URL=https://cooperative.tecnologicaslf.com

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=cooperative
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_password_seguro

SANCTUM_STATEFUL_DOMAINS=cooperative.tecnologicaslf.com
CORS_ALLOWED_ORIGINS=https://cooperative.tecnologicaslf.com
```

> **Si ya desplegaste y ves error CORS** (p. ej. "Access-Control-Allow-Origin' that is not equal to the supplied origin"): edita `apiCooperative/.env` en el VPS y pon `FRONTEND_URL` y `CORS_ALLOWED_ORIGINS` con la URL del front en producción (`https://cooperative.tecnologicaslf.com`). Luego reinicia el contenedor API:  
> `docker compose -f clientCooperative/docker-compose.yml restart api`

> **Si ves "Session store not set on request"** al hacer login: el dominio del frontend debe ser stateful para Sanctum. Asegura `FRONTEND_URL=https://cooperative.tecnologicaslf.com` en `apiCooperative/.env` (la API ya incluye ese host automáticamente). Si usas otro dominio, define `SANCTUM_STATEFUL_DOMAINS=tu-dominio-frontend.com`. Reinicia el contenedor API tras cambiar `.env`.

Genera `APP_KEY` si no lo tienes (o ejecútalo dentro del contenedor después de levantar):

```bash
cd /opt/cooperative/apiCooperative && php artisan key:generate --force
```

(Si no tienes PHP en el host, lo harás en el paso 6 desde el contenedor.)

### 4.2 `.env` en la raíz (para Docker Compose y Postgres)

Si ejecutas compose desde `/opt/cooperative`:

```bash
nano /opt/cooperative/.env
```

Contenido mínimo (mismas credenciales que en `apiCooperative/.env` y URL de la API para el build del cliente):

```env
DB_DATABASE=cooperative
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_password_seguro

NUXT_PUBLIC_API_BASE=https://apicooperative.tecnologicaslf.com
```

### 4.3 Cliente Nuxt (URL de la API)

El frontend debe llamar a la API por su URL pública. En el **mismo `.env` de la raíz** (`/opt/cooperative/.env`) añade:

```env
NUXT_PUBLIC_API_BASE=https://apicooperative.tecnologicaslf.com
```

Docker Compose usa este valor al construir la imagen del cliente. Si ya construiste antes, vuelve a construir: `docker compose -f clientCooperative/docker-compose.yml build client --no-cache`.

---

## 5. Levantar la aplicación con Docker

Desde la carpeta que contiene `apiCooperative/` y `clientCooperative/` (por ejemplo `/opt/cooperative`):

```bash
cd /opt/cooperative

# Build y levantar (NUXT_PUBLIC_API_BASE se lee del .env de esta carpeta)
docker compose -f clientCooperative/docker-compose.yml build --no-cache
docker compose -f clientCooperative/docker-compose.yml up -d

# Comprobar que todo está arriba
docker compose -f clientCooperative/docker-compose.yml ps
```

Migraciones y seed (si hace falta):

```bash
docker compose -f clientCooperative/docker-compose.yml exec api php artisan migrate --force
docker compose -f clientCooperative/docker-compose.yml exec api php artisan db:seed --force
```

En este punto la API responde en `http://IP_VPS:8585` y el front en `http://IP_VPS:3535`. Siguiente paso: poner Nginx delante y los dominios.

---

## 6. Instalar Nginx en el VPS (reverse proxy)

```bash
sudo apt update
sudo apt install -y nginx
```

Copiar las configuraciones del repo a Nginx:

```bash
sudo cp clientCooperative/vps-nginx/apicooperative.tecnologicaslf.com.conf /etc/nginx/sites-available/
sudo cp clientCooperative/vps-nginx/cooperative.tecnologicaslf.com.conf /etc/nginx/sites-available/

sudo ln -s /etc/nginx/sites-available/apicooperative.tecnologicaslf.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/cooperative.tecnologicaslf.com.conf /etc/nginx/sites-enabled/
```

Comprobar y recargar Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Comprueba en el navegador (aún en HTTP):

- http://apicooperative.tecnologicaslf.com
- http://cooperative.tecnologicaslf.com

---

## 7. Activar HTTPS con Let's Encrypt (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d apicooperative.tecnologicaslf.com -d cooperative.tecnologicaslf.com
```

Sigue las preguntas (email, aceptar términos). Certbot modificará los sitios de Nginx y añadirá SSL.

Renovación automática (ya suele estar activa):

```bash
sudo certbot renew --dry-run
```

---

## 8. Comprobar variables finales (Laravel)

Que en `apiCooperative/.env` tengas:

- `APP_URL=https://apicooperative.tecnologicaslf.com`
- `FRONTEND_URL=https://cooperative.tecnologicaslf.com`
- `SANCTUM_STATEFUL_DOMAINS=cooperative.tecnologicaslf.com`
- `CORS_ALLOWED_ORIGINS=https://cooperative.tecnologicaslf.com`

Si cambias algo de entorno, reinicia el contenedor API:

```bash
docker compose -f clientCooperative/docker-compose.yml restart api
```

---

## 9. Resumen de puertos

| Servicio   | Puerto en el host | Dominio                            |
| ---------- | ----------------- | ---------------------------------- |
| API        | 8585              | apicooperative.tecnologicaslf.com  |
| Frontend   | 3535              | cooperative.tecnologicaslf.com     |
| PostgreSQL | 5435              | solo local (no exponer a internet) |

Nginx escucha 80/443 y hace proxy a 8585 y 3535.

---

## Comandos útiles en el VPS

```bash
# Logs
docker compose -f clientCooperative/docker-compose.yml logs -f api

# Reiniciar todo el stack
docker compose -f clientCooperative/docker-compose.yml restart

# Parar
docker compose -f clientCooperative/docker-compose.yml down

# Levantar de nuevo
docker compose -f clientCooperative/docker-compose.yml up -d
```

Si algo no carga, revisa que los dominios apunten al VPS y que los contenedores estén en ejecución (`docker ps`).
