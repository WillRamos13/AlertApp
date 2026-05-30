> **Documento histórico de Fase 3B.** Para el estado corregido y resultados reales utiliza la documentación de **Fase 4**.

# API AlertApp — Fase 3B

Base local: `http://localhost:4000/api/v1`

## Convenciones

- Las escrituras requieren sesión cuando corresponda y cabecera `x-csrf-token`, obtenida desde `GET /auth/csrf`.
- La sesión web usa cookies `HttpOnly`; el frontend Axios envía credenciales automáticamente.
- Roles: Público, `CIUDADANO`, `AGENTE`, `ADMIN`.
- Reportes públicos pendientes se identifican como no verificados y los rechazados/retirados dejan de publicarse.

## Autenticación

| Método | Ruta | Rol | Cuerpo principal | Resultado |
| --- | --- | --- | --- | --- |
| GET | `/auth/csrf` | Público | — | Token CSRF para formularios |
| POST | `/auth/registro` | Público | `nombres`, `apellidos`, `email`, `password` | Crea ciudadano no verificado |
| POST | `/auth/verificar-email` | Público | `token` | Verifica correo |
| POST | `/auth/reenviar-verificacion` | Público | `email` | Reenvío seguro |
| POST | `/auth/login` | Público | `email`, `password` | Cookies de sesión y rol |
| GET | `/auth/me` | C/G/A | — | Usuario autenticado |
| POST | `/auth/refresh` | Sesión refresh | — | Renueva cookie de acceso |
| POST | `/auth/logout` | Sesión | — | Revoca sesión |
| POST | `/auth/recuperar-password` | Público | `email` | Envía enlace si existe cuenta |
| POST | `/auth/restablecer-password` | Público | `token`, `newPassword` | Cambia contraseña y revoca sesiones |

## Mapa, catálogo y reportes ciudadanos

| Método | Ruta | Rol | Función |
| --- | --- | --- | --- |
| GET | `/catalogos/tipos-incidente` | Público | Catálogo activo aprobado |
| GET | `/mapa/reportes` | Público | Marcadores públicos filtrables |
| GET | `/mapa/reportes/:id` | Público | Detalle público disponible |
| POST | `/reportes` | CIUDADANO | Crea reporte multipart con `evidencias` opcionales |
| GET | `/reportes/mios` | CIUDADANO | Historial propio |
| GET | `/reportes/mios/:id` | CIUDADANO | Detalle propio, evidencias y revisión |
| PATCH | `/reportes/:id/retirar` | CIUDADANO | Retira reporte propio pendiente |
| GET | `/reportes/evidencias/:id/acceso` | Según evidencia | Entrega evidencia autorizada |

### Cuerpo multipart para crear reporte

| Campo | Tipo |
| --- | --- |
| `tipoIncidenteId` | UUID |
| `titulo` | Texto 5–150 caracteres |
| `descripcion` | Texto 15–1500 caracteres |
| `ubicacionReferencia` | Texto opcional |
| `distrito` | Texto |
| `fechaHoraIncidente` | ISO datetime |
| `prioridadReportada` | `BAJA`, `MEDIA`, `ALTA` |
| `latitud` / `longitud` | Coordenadas válidas |
| `evidencias` | Hasta 3 imágenes JPG/PNG/WebP, máximo configurado |

## Agente operativo

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/agente/dashboard` | Indicadores operativos reales |
| GET | `/agente/reportes/pendientes` | Mapa/lista de pendientes filtrable |
| GET | `/agente/reportes/:id` | Detalle completo y evidencias |
| POST | `/agente/reportes/:id/validacion` | Valida o rechaza y registra observación |
| GET | `/estadisticas/resumen` | Estadísticas de AlertApp para agente/admin |

Cuerpo de validación:

```json
{
  "decision": "VALIDADO",
  "observaciones": "Incidente revisado.",
  "evidenciaPublicable": false
}
```

## Comunicados

| Método | Ruta | Rol | Función |
| --- | --- | --- | --- |
| GET | `/comunicados` | Público | Comunicados publicados vigentes |
| GET | `/comunicados/publicos/:id` | Público | Detalle publicado |
| GET | `/comunicados/gestion/lista` | AGENTE/ADMIN | Lista de gestión |
| POST | `/comunicados/gestion` | AGENTE/ADMIN | Crear borrador |
| PATCH | `/comunicados/gestion/:id` | AGENTE/ADMIN | Editar comunicado |
| POST | `/comunicados/gestion/:id/publicar` | AGENTE/ADMIN | Publicar |
| POST | `/comunicados/gestion/:id/archivar` | AGENTE/ADMIN | Archivar |

## Administración

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/admin/dashboard` | Indicadores generales y actividad |
| GET | `/admin/usuarios` | Lista filtrable por rol/estado/búsqueda |
| PATCH | `/admin/usuarios/:id` | Edita información permitida |
| PATCH | `/admin/usuarios/:id/estado` | Activa/inactiva/bloquea cuenta |
| POST | `/admin/agentes` | Crea agente con contraseña temporal |
| GET | `/admin/reportes` | Supervisión de reportes |
| GET | `/admin/reportes/:id` | Detalle y evidencias autorizadas |
| PATCH | `/admin/reportes/:id/visibilidad` | Oculta/restaura publicación con motivo auditado |
| GET | `/admin/logs` | Logs con filtros `actor`, `accion`, `entidad`, `desde`, `hasta` |
| GET | `/admin/parametros` | Parámetros y tipos activos |
| PATCH | `/admin/parametros/tipos-incidente/:id/estado` | Habilita/deshabilita tipo |
| GET | `/admin/exportaciones` | Historial de exportaciones |
| POST | `/admin/exportaciones/reportes` | Descarga CSV de reportes |
| POST | `/admin/exportaciones/logs` | Descarga CSV de auditoría |
| GET | `/admin/exportaciones/backup-estado` | Informa responsabilidad del hosting |

## Eventos Socket.IO

| Evento | Visibilidad | Acción frontend |
| --- | --- | --- |
| `reporte:creado` | Público | Actualizar mapa y paneles |
| `reporte:validado` | Público | Actualizar estado y estadísticas |
| `reporte:rechazado` | Público | Retirar del mapa público |
| `reporte:retirado` | Público | Retirar del mapa público |
| `comunicado:publicado` | Público | Actualizar comunicados |
| `comunicado:actualizado` | Público | Refrescar comunicaciones |
| `dashboard:actualizado` | Agente/Admin autenticado | Actualizar indicadores operativos |
