# AlertApp — Versión web auditada para seguridad ciudadana en Ica

AlertApp es una plataforma web responsive para consultar y registrar reportes ciudadanos de seguridad, permitir su revisión por agentes operativos y administrar la plataforma con auditoría. Este repositorio corresponde a la **Fase 4: auditoría, correcciones y preparación previa al despliegue**.

> **Uso responsable:** AlertApp no es una plataforma oficial del INEI, DATACRIM ni de la Policía Nacional del Perú. No reemplaza una denuncia formal ni una llamada a servicios de emergencia. Los reportes pendientes son aportes ciudadanos **no verificados** y los datos sembrados localmente son demostrativos.

## Estado real de esta entrega

| Área | Estado |
| --- | --- |
| Frontend React responsive por roles | Implementado y compilado |
| Backend Express / API REST / Socket.IO | Implementado y compilado |
| Esquema PostgreSQL + PostGIS y migraciones | Implementado; requiere PostgreSQL/PostGIS para ejecución |
| Auth, correo verificado, recuperación y roles | Implementado |
| Mapa, reportes, evidencias, validación y comunicados | Implementado |
| Administración, logs y exportaciones CSV | Implementado |
| Pruebas unitarias de validación real de evidencias | Ejecutadas y aprobadas |
| Suite integrada con base de datos | Preparada y ampliada; debe ejecutarse con PostgreSQL/PostGIS activo |
| Servicios externos de producción | Requieren configurar Cloudinary, Resend y Render |

## Correcciones clave de la auditoría

- Los reportes **pendientes** mantienen visible el punto exacto aprobado, pero ya no publican título, descripción ni referencia textual escritos libremente por el ciudadano hasta la revisión operativa.
- Las evidencias se validan por **firma real de archivo** además del MIME declarado: JPG, PNG y WebP.
- Si una carga de evidencia falla, el reporte no queda publicado de forma incompleta y se limpian los archivos ya almacenados.
- La decisión del agente se actualiza atómicamente para impedir dos validaciones finales simultáneas.
- `/admin/usuarios` devuelve solo ciudadanos y `/admin/agentes` solo agentes, sin depender del filtro del frontend.
- La edición de parámetros queda restringida a valores aprobados; configuraciones sensibles o técnicas no se modifican mediante JSON libre.
- Las exportaciones CSV neutralizan valores que podrían ejecutarse como fórmulas al abrirse en hojas de cálculo.
- La API de evidencias usa cabeceras `private, no-store`.
- El frontend exige URLs de API y Socket.IO en build de producción, en vez de caer silenciosamente a `localhost`.
- Se añadieron confirmaciones en acciones sensibles y manejo de errores/carga en flujos de autenticación.
- Se actualizó `drizzle-orm` para eliminar la vulnerabilidad alta de dependencias de ejecución detectada en la auditoría.

## Tecnologías

| Área | Tecnología |
| --- | --- |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| API/estado de cliente | Axios + TanStack Query + React Hook Form + Zod |
| Mapas | Leaflet + React Leaflet |
| Gráficos | Chart.js |
| Tiempo real | Socket.IO |
| Backend | Node.js + Express + TypeScript |
| Persistencia | PostgreSQL + PostGIS + Drizzle ORM |
| Seguridad | Argon2id, JWT corto, refresh token opaco, cookies HttpOnly, CSRF, Helmet, CORS y rate limiting |
| Evidencias en producción | Cloudinary autenticado |
| Correo en producción | Resend |
| Despliegue previsto | GitHub + Render Blueprint |

## Roles y flujos funcionales

### Público

- Landing page y mapa público centrado en Ica.
- Filtros por tipo, estado, distrito y fechas.
- Reportes pendientes marcados como no verificados; reportes validados marcados como revisados.
- Comunicados preventivos publicados.
- Registro, verificación de correo, login y recuperación de contraseña.

### Ciudadano

- Dashboard propio, formulario de reporte, selección de ubicación exacta y evidencias opcionales.
- Historial, detalle, observaciones del agente y retiro de un reporte pendiente.
- Evidencias propias protegidas y perfil autenticado.

### Agente operativo

- Dashboard y mapa de reportes pendientes.
- Revisión de contenido y evidencias protegidas.
- Validación o rechazo con observación y autorización opcional de evidencia pública.
- Estadísticas internas de AlertApp y comunicados preventivos.

### Administrador

- Indicadores generales, gestión separada de ciudadanos y agentes.
- Supervisión auditada de reportes y evidencias; ocultamiento/restauración del mapa público.
- Aviso legal editable y tipos de incidentes activables/desactivables.
- Logs filtrables y exportaciones CSV auditadas.

## Reglas de publicación y privacidad

| Estado | Visibilidad pública |
| --- | --- |
| `PENDIENTE` | Punto exacto visible; texto libre y evidencia protegidos; etiqueta **no verificado**. |
| `VALIDADO` | Punto y datos revisados visibles; evidencia solo si el agente la aprueba. |
| `RECHAZADO` | Fuera del mapa público; permanece en historial y auditoría. |
| `RETIRADO` | Fuera del mapa público; permanece para el autor y auditoría. |

La publicación de coordenadas exactas fue una decisión aprobada del proyecto y sigue siendo un riesgo de privacidad residual. El administrador dispone de una acción auditada para ocultar reportes sensibles.

## Estructura

```text
AlertApp-Fase4-Final/
├── .github/workflows/ci.yml
├── backend/
│   ├── src/
│   │   ├── config/ db/ middlewares/ modules/ realtime/ services/ shared/
│   │   └── app.ts server.ts
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/ components/ hooks/ pages/ services/ types/
│       └── main.tsx
├── database/init/
├── docs/
├── docker-compose.yml
├── render.yaml
└── package.json
```

## Requisitos locales

- Node.js 20 o posterior.
- npm 10 o posterior.
- Docker Desktop, o PostgreSQL con las extensiones `postgis` y `pgcrypto` disponibles.

## Ejecución local

```bash
npm ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

En otra terminal:

```bash
npm run dev:frontend
```

En PowerShell:

```powershell
npm ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Servicios locales:

| Servicio | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| API | `http://localhost:4000/api/v1` |
| Health check | `http://localhost:4000/api/v1/health` |

Antes de iniciar, reemplaza en `backend/.env` los valores de ejemplo de `JWT_ACCESS_SECRET` y `AUTH_TOKEN_PEPPER` por secretos locales largos.

## Pruebas

### Build validado en esta auditoría

```bash
npm run build
```

### Prueba unitaria ejecutable sin base de datos

```bash
cd backend
npx cross-env NODE_ENV=test ENV_FILE=.env.test.example vitest run tests/security.unit.test.ts
```

### Suite integrada con PostgreSQL/PostGIS

El script ya usa `backend/.env.test.example`; no requiere crear un archivo secreto de pruebas local:

```bash
docker compose up -d postgres
npm test
```

La suite integrada cubre autenticación, roles, reportes, evidencia, sanitización pública, validación concurrente, estadísticas, comunicados, administración, parámetros, logs y exportaciones. En el entorno de auditoría no había una instancia PostgreSQL/PostGIS activa, por lo que su ejecución completa queda pendiente de ejecutarse con Docker o en CI.

## Usuarios demostrativos locales

Solo se crean cuando `SEED_DEMO_DATA=true`. Nunca deben usarse en producción.

| Rol | Correo | Contraseña local |
| --- | --- | --- |
| Ciudadano | `ciudadano.demo@alertapp.local` | `CiudadanoDemo2026!` |
| Agente | `agente.demo@alertapp.local` | `AgenteDemo2026!` |
| Administrador | `admin.demo@alertapp.local` | `AdminDemo2026!` |

## Variables de entorno

### Backend esenciales

| Variable | Producción |
| --- | --- |
| `DATABASE_URL` | Secreta, provista por Render Postgres |
| `DATABASE_SSL` | `true` |
| `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `APP_PUBLIC_URL` | URL HTTPS real del frontend |
| `JWT_ACCESS_SECRET`, `AUTH_TOKEN_PEPPER` | Secretos generados/almacenados en Render |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `none` si frontend/API están en dominios HTTPS distintos |
| `MAIL_PROVIDER`, `RESEND_API_KEY`, `MAIL_FROM` | `resend` y credenciales reales |
| `EVIDENCE_STORAGE_PROVIDER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Credenciales de Cloudinary en Render |
| `MAX_EVIDENCE_SIZE_MB`, `MAX_EVIDENCES_PER_REPORT` | Inicialmente `5` y `3` |
| `SEED_DEMO_DATA`, `EXPOSE_DEV_TOKENS` | `false` |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | Solo para aprovisionamiento inicial; retirar después |

### Frontend esenciales

| Variable | Uso |
| --- | --- |
| `VITE_API_URL` | URL de backend terminando en `/api/v1` |
| `VITE_SOCKET_URL` | URL base del backend |
| `VITE_MAP_TILE_URL`, `VITE_MAP_ATTRIBUTION` | Proveedor de mapas y atribución |
| `VITE_APP_ENV` | `production` |

## GitHub y Render

- `.gitignore` excluye entornos, cargas locales, builds, logs y dependencias.
- `.github/workflows/ci.yml` ejecuta build y tests con un servicio PostGIS.
- `render.yaml` usa `npm ci` desde la raíz del monorepo, publica el frontend estático y ejecuta migración/seed base antes de iniciar la API.
- En producción se requiere configurar Resend y Cloudinary; no se incluyen secretos en el repositorio.

La guía paso a paso está en [`docs/DESPLIEGUE-GITHUB-RENDER.md`](docs/DESPLIEGUE-GITHUB-RENDER.md).

## Documentación de esta entrega

| Documento | Contenido |
| --- | --- |
| `docs/AUDITORIA-FASE-4.md` | Diagnóstico, correcciones, seguridad, resultados y limitaciones |
| `docs/API-FASE-4.md` | Endpoints finales y reglas de visibilidad |
| `docs/PRUEBAS-FASE-4.md` | Pruebas ejecutadas y plan manual/integrado |
| `docs/DESPLIEGUE-GITHUB-RENDER.md` | GitHub, Render y servicios externos |

## Limitaciones reales pendientes antes de publicar

1. Ejecutar la suite integrada contra PostgreSQL/PostGIS activo mediante Docker o GitHub Actions.
2. Probar Resend con dominio/remitente real y Cloudinary con recursos autenticados reales.
3. Realizar revisión visual manual en navegador de escritorio, tablet y celular; en el entorno de auditoría el motor headless disponible no generó capturas verificables.
4. Revisar política legal y de privacidad por la decisión de publicar ubicaciones exactas.
5. El cambio obligatorio de contraseña del agente en primer login no está automatizado; la contraseña inicial debe entregarse de forma segura y cambiarse operativamente antes de uso real.
6. `drizzle-kit` mantiene avisos moderados en dependencias exclusivas de desarrollo; la auditoría de dependencias de producción (`npm audit --omit=dev`) queda limpia.
#   A l e r t A p p  
 