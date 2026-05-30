# Guía previa al despliegue — GitHub y Render

Esta fase deja la aplicación preparada, pero **no realiza el despliegue**. El lanzamiento real requiere tu repositorio, tu cuenta Render y credenciales externas válidas.

## 1. Verificación local obligatoria

```bash
npm ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run build
npm test
```

Cambia antes los secretos locales de ejemplo en `backend/.env`. Revisa el flujo visual con navegador real y elimina datos de prueba si copiarás la base a otro entorno.

## 2. Publicación segura en GitHub

```bash
git init
git add .
git status
git commit -m "feat: entregar AlertApp auditada para despliegue"
git branch -M main
git remote add origin TU_URL_DE_GITHUB
git push -u origin main
```

Antes de `git push`, confirma que no aparecen en `git status`:

- `.env` reales.
- Carpetas `uploads/`.
- Archivos CSV exportados.
- API keys, tokens o contraseñas productivas.

## 3. Servicios definidos por `render.yaml`

| Recurso | Propósito |
| --- | --- |
| `alertapp-api` | Web Service para Express y Socket.IO |
| `alertapp-web` | Static Site de React/Vite con rewrite SPA |
| `alertapp-db` | PostgreSQL administrado |

El Blueprint instala desde la raíz del monorepo mediante `npm ci`; así utiliza el `package-lock.json` auditado y evita instalaciones no deterministas. El backend ejecuta migraciones y seed base antes de iniciar.

## 4. Crear el Blueprint

1. En Render, crea un nuevo Blueprint conectado al repositorio de GitHub.
2. Selecciona el archivo `render.yaml` ubicado en la raíz.
3. Revisa nombres de servicios y plan de PostgreSQL antes de confirmar.
4. Completa todas las variables marcadas como manuales.

## 5. Variables manuales del backend

| Variable | Valor requerido |
| --- | --- |
| `FRONTEND_URL` | URL HTTPS publicada del frontend |
| `CORS_ALLOWED_ORIGINS` | La URL anterior; agrega dominios propios separados por coma si corresponde |
| `APP_PUBLIC_URL` | URL del frontend utilizada en enlaces enviados por correo |
| `MAIL_FROM` | Remitente verificado por Resend |
| `RESEND_API_KEY` | Clave privada almacenada solo en Render |
| `CLOUDINARY_CLOUD_NAME` | Nombre de cuenta |
| `CLOUDINARY_API_KEY` | Clave almacenada solo en Render |
| `CLOUDINARY_API_SECRET` | Secreto almacenado solo en Render |
| `INITIAL_ADMIN_EMAIL` | Cuenta administrativa inicial |
| `INITIAL_ADMIN_PASSWORD` | Contraseña temporal robusta; retirar tras aprovisionamiento |

Valores fijados por Blueprint:

```env
NODE_ENV=production
DATABASE_SSL=true
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
MAIL_PROVIDER=resend
EVIDENCE_STORAGE_PROVIDER=cloudinary
SEED_DEMO_DATA=false
EXPOSE_DEV_TOKENS=false
```

## 6. Variables del frontend

| Variable | Configuración |
| --- | --- |
| `VITE_API_URL` | `https://TU_API/api/v1` |
| `VITE_SOCKET_URL` | `https://TU_API` |
| `VITE_MAP_TILE_URL` | URL de tiles autorizada para tu nivel de tráfico |
| `VITE_MAP_ATTRIBUTION` | Texto de atribución obligatorio del proveedor |
| `VITE_APP_ENV` | `production` |

El frontend auditado detiene el build productivo si faltan `VITE_API_URL` o `VITE_SOCKET_URL`; no utilizará `localhost` silenciosamente en producción.

## 7. Base de datos, migraciones y semillas

La migración inicial habilita `pgcrypto` y `postgis`, y la migración Fase 4 agrega restricciones de integridad sobre evidencias y revisiones. El seed productivo carga roles, catálogo y parámetros; no carga usuarios ni reportes demostrativos si `SEED_DEMO_DATA=false`.

Después de crear el administrador inicial:

1. Accede con credenciales temporales por canal seguro.
2. Sustituye la contraseña operativamente antes de uso real.
3. Elimina `INITIAL_ADMIN_PASSWORD` de Render.
4. Revisa los logs iniciales.

**Limitación conocida:** el cambio forzado de contraseña en primer ingreso no está automatizado en esta entrega.

## 8. Evidencias y correo

### Cloudinary

- El backend sube evidencias como recursos autenticados.
- Las imágenes pendientes no se publican.
- Una imagen se vuelve pública solo cuando el agente valida el reporte y autoriza la evidencia.
- No guardes imágenes en el filesystem del Web Service de Render para producción.

### Resend

- Configura un dominio/remitente verificado.
- Prueba verificación de correo y recuperación antes de habilitar usuarios reales.
- Nunca incluyas la clave en GitHub o frontend.

## 9. Checklist posterior al primer despliegue

1. Consulta `GET /api/v1/health` y confirma conexión a PostgreSQL.
2. Registra un ciudadano usando un correo controlado y verifica la recepción del enlace.
3. Inicia sesión como administrador y crea un agente.
4. Crea un reporte de prueba con una imagen no sensible.
5. Comprueba que el mapa público muestre punto exacto y rótulo no verificado, pero no el texto libre pendiente.
6. Valida o rechaza desde el agente y comprueba cambios en ciudadano y mapa.
7. Publica un comunicado y revisa actualización en tiempo real.
8. Descarga exportaciones y verifica logs.
9. Oculta/elimina reportes de prueba antes de abrir el servicio a terceros.

## 10. Backups y producción real

La aplicación genera exportaciones CSV auditadas. El respaldo integral, recuperación y retención de PostgreSQL deben configurarse en el servicio de base de datos de Render elegido para producción. No uses una configuración temporal/gratuita como repositorio definitivo de información real de usuarios.
