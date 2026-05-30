> **Documento histórico de Fase 3B.** Para el estado corregido y resultados reales utiliza la documentación de **Fase 4**.

# Verificación de AlertApp — Fase 3B

## Ejecución realizada

```bash
npm install
npm run build
npm run test:prepare --workspace backend
cd backend && NODE_ENV=test ENV_FILE=.env.test npx vitest run
```

El script habitual del repositorio para un entorno local estable es `npm test`, que encadena la preparación y la suite. En el entorno de verificación se ejecutaron esos dos pasos de forma separada para trabajar con el servidor PostgreSQL/PostGIS temporal.

La prueba de integración se ejecutó sobre una instancia PostgreSQL compatible con PostGIS preparada para verificación. En la computadora del propietario puede repetirse con `docker compose up -d postgres`.

## Resultado automatizado

| Verificación | Resultado |
| --- | --- |
| Compilación TypeScript backend | Correcta |
| Compilación Vite frontend | Correcta |
| Migraciones PostGIS y tablas funcionales | Correcta |
| Seed de roles, catálogo, usuarios y datos demo | Correcto |
| Health check y conexión de base de datos | Correcto |
| Registro, verificación, login, logout y reset | Correcto |
| Contraseña almacenada como Argon2id | Verificado |
| Bloqueo de rutas sin autenticación | Correcto |
| Bloqueo de acceso por rol | Correcto |
| Mapa público y marcadores demostrativos rotulados | Correcto mediante API |
| Creación de reporte con evidencia | Correcta |
| Historial y detalle ciudadano | Correctos |
| Validación y rechazo del agente | Correctos |
| Evidencia pública solo al aprobarla el agente | Correcto |
| Estadísticas de AlertApp | Correctas |
| Creación, edición y publicación de comunicado | Correctas |
| Gestión administrativa de usuario y agente | Correcta |
| Supervisión/visibilidad de reportes por administrador | Correcta |
| Parámetros: habilitar/deshabilitar tipo | Correcto |
| Logs filtrables y exportación CSV | Correctos |

Resultado de suite:

```text
Test Files: 2 passed
Tests:      13 passed
```

## Verificación de ejecución del backend compilado

Se inició el backend generado en `backend/dist` y se consultó el health check:

```json
{
  "ok": true,
  "data": {
    "service": "alertapp-api",
    "database": "connected"
  }
}
```

## Pruebas manuales necesarias antes de producción

| Prueba | Motivo |
| --- | --- |
| Registro/verificación con Resend real | Requiere dominio y API key del propietario |
| Subida/descarga de evidencias Cloudinary | Requiere cuenta Cloudinary del propietario |
| Despliegue Render y dominio HTTPS final | Requiere cuenta Render y URLs públicas |
| Prueba responsive en celulares reales | La compilación no sustituye validación de interacción táctil |
| Revisión legal/privacidad de ubicación exacta pública | Decisión sensible para un sistema real |
| Revisión del proveedor de tiles del mapa | Depende del volumen y condiciones de uso en producción |

## Política de datos demo

Los seeds demostrativos se ejecutan únicamente con `SEED_DEMO_DATA=true`. En producción, el backend rechaza iniciar con esta opción activa. Los registros demo incorporan la marca `es_dato_demostrativo=true` y la interfaz los rotula como tales.
