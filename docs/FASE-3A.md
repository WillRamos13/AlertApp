# Alcance implementado en la Fase 3A

Implementado:

- Backend Express + TypeScript organizado por módulos.
- PostgreSQL + extensión PostGIS preparada desde migración inicial.
- Drizzle ORM con esquema inicial de autenticación, auditoría y catálogo de incidentes.
- Registro ciudadano y verificación de correo.
- Login, renovación de sesión, consulta del usuario actual y logout.
- Solicitud y restablecimiento de contraseña.
- Control por roles y rutas de comprobación.
- Gestión administrativa inicial de usuarios: listado y cambio de estado.
- Seed local de roles, catálogo aprobado y tres usuarios de prueba.
- Seguridad base: Argon2id, JWT corto, refresh token rotado, cookies HttpOnly, CSRF, Helmet, CORS, rate limiting y auditoría.
- Configuración inicial de Render mediante `render.yaml`.

No implementado todavía:

- Frontend visual React.
- Mapa, reportes ciudadanos y carga de evidencias.
- Socket.IO en ejecución.
- Estadísticas y comunicados.
- Administración completa, exportaciones y backups operativos.
