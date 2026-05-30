# API final auditada — AlertApp Fase 4

Base local: `http://localhost:4000/api/v1`

## Convenciones de seguridad

- Las escrituras requieren `x-csrf-token`, obtenido de `GET /auth/csrf`.
- La sesión usa cookies `HttpOnly`; en producción deben ser `Secure`.
- Roles: `CIUDADANO`, `AGENTE`, `ADMIN`.
- Los pendientes se publican como **no verificados**; el mapa conserva coordenada exacta aprobada, pero oculta texto libre y evidencia hasta revisión.
- Evidencias: JPG/PNG/WebP válidos por firma real; entrega privada o autorizada mediante endpoint.

## Autenticación

| Método | Ruta | Acceso | Función |
| --- | --- | --- | --- |
| GET | `/auth/csrf` | Público | Token CSRF |
| POST | `/auth/registro` | Público | Registra ciudadano no verificado |
| POST | `/auth/verificar-email` | Público | Verifica cuenta |
| POST | `/auth/reenviar-verificacion` | Público | Reenvía correo de verificación |
| POST | `/auth/login` | Público | Abre sesión |
| POST | `/auth/refresh` | Sesión refresh | Rota acceso |
| POST | `/auth/logout` | Sesión | Revoca sesión |
| GET | `/auth/me` | Autenticado | Perfil actual |
| POST | `/auth/recuperar-password` | Público | Inicia recuperación segura |
| POST | `/auth/restablecer-password` | Público | Cambia contraseña y revoca sesiones |

## Catálogo y mapa público

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/catalogos/tipos-incidente` | Tipos habilitados |
| GET | `/mapa/reportes` | Reportes públicos filtrables |
| GET | `/mapa/reportes/:id` | Detalle público sanitizado |

Filtros del mapa: `estado`, `tipo`, `distrito`, `desde`, `hasta`, `page`, `limit`.

### Respuesta pública pendiente

Un pendiente no devuelve el texto original aportado por el ciudadano. El título se convierte en una etiqueta de tipo + no verificado y la descripción informa que el detalle estará disponible tras revisión.

## Reportes del ciudadano

| Método | Ruta | Función |
| --- | --- | --- |
| POST | `/reportes` | Crea reporte multipart; rol ciudadano |
| GET | `/reportes/mios` | Historial propio |
| GET | `/reportes/mios/:id` | Detalle propio con revisión/evidencias |
| PATCH | `/reportes/:id/retirar` | Retira pendiente propio |
| GET | `/reportes/evidencias/:id/acceso` | Obtiene evidencia si tiene autorización |

Campos multipart de creación: `tipoIncidenteId`, `titulo`, `descripcion`, `latitud`, `longitud`, `ubicacionReferencia`, `distrito`, `fechaHoraIncidente`, `prioridadReportada`, `evidencias`.

## Agente operativo

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/agente/dashboard` | Métricas operativas |
| GET | `/agente/reportes/pendientes` | Cola/mapa pendiente |
| GET | `/agente/reportes/:id` | Detalle y evidencia protegida |
| POST | `/agente/reportes/:id/validacion` | Validar/rechazar atómicamente |
| GET | `/estadisticas/resumen` | Estadísticas de datos AlertApp |

Cuerpo de validación:

```json
{
  "decision": "VALIDADO",
  "observaciones": "Información revisada.",
  "evidenciaPublicable": false
}
```

## Comunicados

| Método | Ruta | Acceso | Función |
| --- | --- | --- | --- |
| GET | `/comunicados` | Público | Publicados vigentes |
| GET | `/comunicados/publicos/:id` | Público | Detalle público |
| GET | `/comunicados/gestion/lista` | Agente/Admin | Gestión |
| POST | `/comunicados/gestion` | Agente/Admin | Crear borrador |
| PATCH | `/comunicados/gestion/:id` | Agente/Admin | Editar |
| POST | `/comunicados/gestion/:id/publicar` | Agente/Admin | Publicar |
| POST | `/comunicados/gestion/:id/archivar` | Agente/Admin | Archivar |

## Administración

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/admin/dashboard` | Indicadores reales |
| GET | `/admin/usuarios` | Lista exclusiva de ciudadanos |
| PATCH | `/admin/usuarios/:id` | Editar datos permitidos |
| PATCH | `/admin/usuarios/:id/estado` | Activar/inactivar/bloquear |
| GET | `/admin/agentes` | Lista exclusiva de agentes |
| POST | `/admin/agentes` | Crear agente |
| GET | `/admin/reportes` | Supervisión |
| GET | `/admin/reportes/:id` | Detalle auditado |
| PATCH | `/admin/reportes/:id/visibilidad` | Ocultar/restaurar publicación |
| GET | `/admin/logs` | Auditoría filtrable |
| GET | `/admin/parametros` | Parámetros y catálogo |
| PATCH | `/admin/parametros/AVISO_LEGAL` | Modificar aviso legal validado |
| PATCH | `/admin/parametros/tipos-incidente/:id/estado` | Activar/desactivar tipo |
| GET | `/admin/exportaciones` | Historial |
| POST | `/admin/exportaciones/reportes` | CSV seguro de reportes |
| POST | `/admin/exportaciones/logs` | CSV seguro de auditoría |
| GET | `/admin/exportaciones/backup-estado` | Informa alcance de backups |

## Eventos tiempo real

| Evento | Audiencia |
| --- | --- |
| `reporte:creado` | Público, solo identificador/estado |
| `reporte:validado` | Público |
| `reporte:rechazado` | Público para retirar marcador |
| `reporte:retirado` | Público para retirar marcador |
| `comunicado:publicado` / `comunicado:actualizado` | Público |
| `dashboard:actualizado` | Agente/Admin autenticado |
