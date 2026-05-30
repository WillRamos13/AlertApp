# Verificación y pruebas — AlertApp Fase 4

## Resultado real en el entorno de auditoría

| Prueba | Comando / método | Resultado |
| --- | --- | --- |
| Compilación backend | `npm run build --workspace backend` | Aprobada |
| Compilación frontend | `npm run build --workspace frontend` | Aprobada |
| Build completo | `npm run build` | Aprobado |
| Validación binaria de evidencia | `vitest run tests/security.unit.test.ts` | Aprobada: 2/2 |
| Dependencias runtime | `npm audit --omit=dev --json` | Aprobada: 0 vulnerabilidades reportadas |
| Dependencias incluyendo desarrollo | `npm audit --json` | 4 moderadas residuales de `drizzle-kit`/`esbuild` en tooling de desarrollo |
| Suite integrada | `npm test` | No completada aquí: requiere PostgreSQL/PostGIS activo; el fallo observado es `ECONNREFUSED 127.0.0.1:5432` |
| Capturas visuales headless | Chromium local | No verificables: el proceso se bloqueó antes de escribir PNG |

## Error real detectado y corregido en ejecución de pruebas

La Fase 3B invocaba `ENV_FILE=.env.test`, pero ese archivo no debía incluirse en el ZIP por seguridad. El script fallaba antes de conectarse a la base. Se corrigió para utilizar `backend/.env.test.example`, que contiene únicamente valores locales de prueba y está versionado deliberadamente.

## Cobertura integrada ampliada para ejecutar con PostgreSQL/PostGIS

La suite preparada en `backend/tests/*.test.ts` cubre:

| Área | Verificación |
| --- | --- |
| Auth | Registro, verificación de correo, login, logout, recuperación y Argon2id |
| Roles | Rechazo sin autenticación y rechazo por rol incorrecto |
| Catálogo | 11 tipos de incidente aprobados |
| Ciudadano | Crear reporte, historial, detalle y evidencia propia |
| Privacidad pública | Pendiente no expone texto libre antes de validación |
| Archivos | Rechaza archivo falso con MIME de imagen |
| Agente | Pendientes, detalle, validar, rechazar y observación |
| Concurrencia | Dos decisiones simultáneas: solo una finaliza, la otra devuelve conflicto |
| Mapa | Validado visible y rechazado no público |
| Comunicados | Crear, editar y publicar |
| Estadísticas | Datos identificados como AlertApp, no oficiales |
| Administración | Separación usuarios/agentes, estados, visibilidad, tipos y parámetros |
| Exportación | CSV y neutralización de fórmula potencial |
| Logs | Acciones relevantes registradas |

## Cómo ejecutar la suite completa localmente

```bash
npm ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm test
```

`docker-compose.yml` levanta PostgreSQL con PostGIS y crea la base `alertapp_test` utilizada por el script.

## Pruebas manuales obligatorias antes del despliegue

### Visual y responsive

1. Inicia backend y frontend localmente.
2. Abre DevTools del navegador y prueba anchos `1440`, `768` y `390` píxeles.
3. Comprueba landing, login, registro, mapa, reporte, historial, dashboard agente, revisión, dashboard admin, tablas, logs y exportaciones.
4. Verifica que no existan errores rojos en consola.

### Servicios productivos

1. Configura Resend con remitente verificado y realiza registro/recuperación con un correo controlado.
2. Configura Cloudinary autenticado; publica una imagen permitida y prueba acceso del propietario/agente, rechazo del público pendiente y publicación tras validación aprobada.
3. Configura Render, ejecuta health check y prueba CORS/cookies entre dominios HTTPS.

### Privacidad

1. Crea un reporte pendiente con texto que simule información personal y comprueba que el mapa público no lo muestre.
2. Confirma que la coordenada exacta sí permanece visible por la decisión aprobada.
3. Verifica que un administrador pueda ocultar un punto sensible y que se registre en logs.
