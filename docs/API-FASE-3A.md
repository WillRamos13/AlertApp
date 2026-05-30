# API REST disponible — Fase 3A

Base URL local: `http://localhost:4000/api/v1`

## Requisito CSRF

Las peticiones `POST` y `PATCH` implementadas en esta fase utilizan cookie y cabecera CSRF:

1. Obtener token con `GET /auth/csrf` conservando la cookie recibida.
2. Enviar el valor devuelto como cabecera `X-CSRF-Token` en la petición de escritura.

## Autenticación

| Método | Ruta | Acceso | Body principal | Respuesta |
|---|---|---|---|---|
| GET | `/auth/csrf` | Público | — | Token CSRF y cookie |
| POST | `/auth/registro` | Público | `nombres`, `apellidos`, `email`, `password` | Ciudadano creado, correo de verificación enviado |
| POST | `/auth/reenviar-verificacion` | Público | `email` | Respuesta neutra |
| POST | `/auth/verificar-email` | Público | `token` | Correo verificado |
| POST | `/auth/login` | Público | `email`, `password` | Usuario autenticado y cookies seguras |
| POST | `/auth/refresh` | Sesión refresh | — | Sesión rotada |
| POST | `/auth/logout` | Sesión | — | Sesión revocada |
| GET | `/auth/me` | Autenticado | — | Datos seguros del usuario |
| POST | `/auth/recuperar-password` | Público | `email` | Respuesta neutra |
| POST | `/auth/restablecer-password` | Público | `token`, `newPassword` | Contraseña cambiada |

## Comprobación de roles

| Método | Ruta | Rol permitido | Respuesta |
|---|---|---|---|
| GET | `/acceso/ciudadano` | Ciudadano | Acceso autorizado |
| GET | `/acceso/agente` | Agente | Acceso autorizado |
| GET | `/acceso/administrador` | Administrador | Acceso autorizado |

## Administración inicial

| Método | Ruta | Rol permitido | Función |
|---|---|---|---|
| GET | `/admin/usuarios` | Administrador | Listar usuarios sin exponer hashes |
| PATCH | `/admin/usuarios/:id/estado` | Administrador | Cambiar `ACTIVO`, `INACTIVO` o `BLOQUEADO` con motivo |
| GET | `/admin/logs` | Administrador | Consultar auditoría inicial |

## Catálogos y salud

| Método | Ruta | Acceso | Función |
|---|---|---|---|
| GET | `/health` | Público | Validar servicio y conexión PostgreSQL |
| GET | `/catalogos/tipos-incidente` | Público | Consultar las 11 categorías aprobadas |

## Ejemplo de prueba con curl

```bash
# 1. Obtener CSRF y conservar cookie
curl -c cookies.txt http://localhost:4000/api/v1/auth/csrf

# Copia csrfToken de la respuesta y úsalo en CSRF_TOKEN.
CSRF_TOKEN="pegar_token_aqui"

# 2. Login de usuario demo local
curl -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"email":"ciudadano.demo@alertapp.local","password":"CiudadanoDemo2026!"}' \
  http://localhost:4000/api/v1/auth/login

# 3. Consultar usuario autenticado
curl -b cookies.txt http://localhost:4000/api/v1/auth/me
```

Las credenciales de ejemplo solo pertenecen al entorno local con `SEED_DEMO_DATA=true`; nunca deben habilitarse en producción.
