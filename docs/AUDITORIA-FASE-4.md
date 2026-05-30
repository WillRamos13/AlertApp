# Auditoría integral — Fase 4 de AlertApp

## Alcance auditado

Se revisó el repositorio heredado de Fase 3B, incluyendo frontend React, backend Express, esquema y migraciones PostgreSQL/PostGIS, seeds, API, autenticación, autorización, evidencias, tiempo real, configuración GitHub/Render y documentación.

La auditoría conserva la arquitectura aprobada y la decisión funcional de publicar ubicaciones exactas; las correcciones se concentran en proteger contenido libre/evidencias, consistencia transaccional, autorización administrativa, exportaciones y reproducibilidad.

## Diagnóstico inicial

| Área | Situación encontrada | Acción |
| --- | --- | --- |
| Compilación | Frontend y backend compilaban antes de la corrección | Conservado y recompilado después de cambios |
| Módulos funcionales | Estaban presentes mapa, reportes, agente, admin, comunicaciones y exportaciones | Conservados |
| Privacidad pública | Un pendiente publicaba inmediatamente título, descripción y referencia libre | Corregido: se publica estado, categoría y coordenadas; el texto se sustituye hasta validación |
| Evidencias | Solo se validaba MIME declarado | Corregido: firma binaria real JPG/PNG/WebP |
| Carga parcial | Un fallo al almacenar evidencia podía dejar reporte incompleto | Corregido: rollback lógico y limpieza de archivos |
| Revisión por agente | Existía carrera entre dos decisiones simultáneas | Corregido: actualización atómica condicionada a `PENDIENTE` |
| Rutas administrativas | Listado de agentes podía devolver otros roles si el frontend omitía filtro | Corregido en backend |
| Parámetros | Valor JSON administrativo no estaba tipado por clave | Corregido: solo aviso legal editable con validación; valores técnicos protegidos |
| CSV | Campos libres podían iniciar fórmulas de spreadsheet | Corregido: neutralización de prefijos peligrosos |
| Evidencia entregada | No se fijaba no-cache explícito | Corregido con `Cache-Control: private, no-store` |
| Frontend producción | Sin variable podía caer a URL localhost | Corregido: configuración requerida en build de producción |
| Pruebas | `npm test` requería `.env.test` no incluido en el ZIP | Corregido para usar `.env.test.example` reproducible |
| Dependencias | Auditoría registraba vulnerabilidad alta de runtime en `drizzle-orm` | Actualizado; runtime sin vulnerabilidades reportadas |

## Archivos de código modificados

### Backend

- `backend/package.json`
- `backend/src/app.ts`
- `backend/src/db/migrations/0002_security_integrity_hardening.sql` *(nuevo)*
- `backend/src/db/migrations/meta/_journal.json`
- `backend/src/db/schema/evidences.ts`
- `backend/src/db/schema/reports.ts`
- `backend/src/db/seed.ts`
- `backend/src/modules/admin/admin.controller.ts`
- `backend/src/modules/admin/admin.routes.ts`
- `backend/src/modules/agente/agent.controller.ts`
- `backend/src/modules/evidencias/evidence.service.ts`
- `backend/src/modules/exportaciones/exports.controller.ts`
- `backend/src/modules/parametros/parameters.controller.ts`
- `backend/src/modules/parametros/parameters.schemas.ts` *(nuevo)*
- `backend/src/modules/reportes/reports.controller.ts`
- `backend/src/modules/reportes/reports.routes.ts`
- `backend/tests/auth.integration.test.ts`
- `backend/tests/platform.integration.test.ts`
- `backend/tests/security.unit.test.ts` *(nuevo)*

### Frontend

- `frontend/package.json`
- `frontend/src/pages/admin/AdminPages.tsx`
- `frontend/src/pages/citizen/CitizenPages.tsx`
- `frontend/src/pages/public/AuthPages.tsx`
- `frontend/src/pages/public/LandingPage.tsx`
- `frontend/src/pages/public/PublicMapPage.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/services/socket.ts`

### Configuración y documentación

- `package.json`
- `package-lock.json`
- `render.yaml`
- `README.md`
- `docs/AUDITORIA-FASE-4.md` *(nuevo)*
- `docs/API-FASE-4.md` *(nuevo)*
- `docs/PRUEBAS-FASE-4.md` *(nuevo)*
- `docs/DESPLIEGUE-GITHUB-RENDER.md`

## Correcciones de seguridad

### Reportes públicos pendientes

La ubicación exacta sigue pública por decisión aprobada, pero un reporte en estado `PENDIENTE` entrega al mapa únicamente datos controlados: categoría, estado, fecha, coordenadas y rótulo de no verificación. El título, la descripción y la referencia textual escrita libremente por el usuario se ocultan hasta que un agente lo valide.

### Evidencias

- Se acepta solamente contenido con firma real JPG, PNG o WebP coincidente con el MIME declarado.
- Los nombres originales se normalizan antes de persistirse.
- La evidencia no aprobada permanece privada.
- La respuesta de evidencia se entrega con cabecera de no almacenamiento en caché.
- Si una carga falla, se eliminan archivos previamente almacenados y se elimina el reporte incompleto.

### Autorización y consistencia

- La ruta `/admin/usuarios` fuerza el ámbito ciudadano.
- La ruta `/admin/agentes` fuerza el ámbito agente.
- La validación/rechazo de reporte opera mediante actualización condicional atómica; una segunda decisión concurrente recibe conflicto.
- Parámetros técnicos de despliegue no se editan con JSON arbitrario.
- Las exportaciones CSV neutralizan entradas que comienzan con `=`, `+`, `-` o `@`.

### Integridad de base de datos

La migración `0002_security_integrity_hardening.sql` agrega:

- Tamaño de evidencia mayor a cero.
- Prohibición de publicar evidencia no aprobada por agente.
- Coherencia entre estado final del reporte y fecha de revisión.

## Correcciones UX/UI y responsive

- Texto del mapa y landing actualizado para informar que la ubicación exacta es pública y el texto pendiente se protege hasta revisión.
- Registro y restablecimiento permiten mostrar/ocultar contraseña y muestran estados de carga/error consistentes.
- Recuperación y verificación de correo manejan token ausente y fallas de API.
- Previsualización de archivos libera URLs temporales para evitar consumo innecesario de memoria.
- Retiro de reportes y acciones administrativas sensibles solicitan confirmación previa.
- El panel de parámetros permite actualizar el aviso legal validado y distingue configuraciones protegidas.

## Auditoría de dependencias

| Comando | Resultado |
| --- | --- |
| `npm audit --omit=dev --json` | `0` vulnerabilidades reportadas en dependencias de producción |
| `npm audit --json` | `4` alertas moderadas residuales en dependencias transitivas de `drizzle-kit`, usada en desarrollo/migraciones |

No se aplicó el arreglo automático sugerido para `drizzle-kit` porque npm propone un cambio de versión mayor/regresivo que debe evaluarse separadamente para no romper migraciones. Las alertas residuales no forman parte del runtime del servicio desplegado.

## Limitaciones no ocultas

- No se ejecutó despliegue real en Render.
- Cloudinary y Resend requieren credenciales reales antes de validar el flujo productivo.
- No se ejecutó la suite integrada completa en este entorno porque no había PostgreSQL/PostGIS activo; queda lista para Docker/CI.
- No se pudieron producir capturas confiables: Chromium headless del entorno quedó bloqueado durante el render; la revisión visual final debe realizarse en un navegador local.
- El primer cambio obligatorio de contraseña de una cuenta agente creada por admin todavía no está automatizado.
