# 📋 DOCUMENTO COMPLETO DE RUTAS - ALTUS GYM

## ✅ VERIFICACIÓN COMPLETA DE RUTAS

Todas las rutas están disponibles con y sin el prefijo `/api` para máxima compatibilidad.

---

## 🔐 AUTH (`/auth` y `/api/auth`)

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| POST | `/request-access` | Solicitar acceso (nuevo registro) | ✅ |
| POST | `/complete-registration` | Completar registro con código | ✅ |
| POST | `/verify-code` | Verificar código de acceso | ✅ |
| POST | `/register` | Registro legacy | ✅ |
| POST | `/login` | Iniciar sesión | ✅ |
| GET | `/me` | Obtener usuario actual | ✅ |

---

## 👥 USERS (`/users` y `/api/users`)

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| GET | `/stats` | Obtener estadísticas del usuario | ✅ |
| GET | `/profile` | Obtener perfil completo | ✅ |
| PUT | `/profile` | Actualizar perfil | ✅ |
| GET | `/memberships` | Obtener membresías disponibles | ✅ |
| GET | `/badges/definitions` | Obtener definiciones de insignias | ✅ |
| GET | `/search` | Buscar usuarios | ✅ |
| GET | `/:id` | Obtener usuario por ID | ✅ |
| PUT | `/:id/role` | Actualizar rol (admin) | ✅ |
| PUT | `/:id/membership` | Actualizar membresía (admin) | ✅ |

---

## 💪 WORKOUTS (`/workouts` y `/api/workouts`)

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| GET | `/templates/all` | Obtener plantillas de rutinas | ✅ |
| GET | `/history` | Obtener historial de entrenamientos | ✅ |
| POST | `/` | Registrar entrenamiento | ✅ |
| GET | `/:id` | Obtener entrenamiento específico | ✅ |
| DELETE | `/:id` | Eliminar entrenamiento | ✅ |

---

## 📱 SOCIAL (`/social` y `/api/social`)

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| GET | `/feed` | Obtener feed de publicaciones | ✅ |
| GET | `/user/:userId/posts` | Obtener posts de un usuario | ✅ |
| POST | `/` | Crear publicación | ✅ |
| POST | `/:id/poll/vote` | Votar en encuesta | ✅ |
| POST | `/:id/like` | Dar like | ✅ |
| POST | `/:id/comment` | Comentar publicación | ✅ |
| POST | `/:id/share` | Compartir publicación | ✅ |
| POST | `/:id/follow` | Seguir usuario | ✅ |
| POST | `/:id/unfollow` | Dejar de seguir | ✅ |
| POST | `/:id/accept-follow` | Aceptar solicitud de seguimiento | ✅ |
| POST | `/:id/reject-follow` | Rechazar solicitud de seguimiento | ✅ |
| GET | `/follow-requests` | Obtener solicitudes pendientes | ✅ |
| GET | `/following` | Obtener usuarios seguidos | ✅ |
| GET | `/followers` | Obtener seguidores | ✅ |
| GET | `/:id/follow-status` | Obtener estado de seguimiento | ✅ |
| DELETE | `/:id` | Eliminar publicación | ✅ |

---

## 🎯 CHALLENGES (`/challenges` y `/api/challenges`)

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| GET | `/` | Obtener retos activos | ✅ |
| GET | `/my` | Obtener mis retos | ✅ |
| GET | `/:id` | Obtener reto específico | ✅ |
| POST | `/` | Crear reto | ✅ |
| POST | `/:id/join` | Unirse a reto | ✅ |
| DELETE | `/:id/leave` | Abandonar reto | ✅ |
| PUT | `/:id/progress` | Actualizar progreso | ✅ |
| POST | `/:id/complete` | Completar reto y obtener XP | ✅ |
| GET | `/:id/leaderboard` | Obtener leaderboard | ✅ |
| DELETE | `/:id` | Eliminar reto (admin) | ✅ |

---

## 📅 CLASSES (`/classes` y `/api/classes`)

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| GET | `/` | Obtener todas las clases | ✅ |
| GET | `/:id` | Obtener clase específica | ✅ |
| POST | `/` | Crear clase (admin/trainer) | ✅ |
| PUT | `/:id` | Actualizar clase (admin/trainer) | ✅ |
| POST | `/:id/enroll` | Inscribirse a clase | ✅ |
| DELETE | `/:id/enroll` | Cancelar inscripción | ✅ |
| POST | `/:id/complete` | Completar clase y obtener XP | ✅ |
| POST | `/:id/cancel` | Cancelar clase (admin/trainer) | ✅ |
| DELETE | `/:id` | Eliminar clase (admin) | ✅ |

---

## 💬 CHAT (`/chat` y `/api/chat`)

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| GET | `/conversations` | Obtener conversaciones | ✅ |
| GET | `/messages/:userId` | Obtener mensajes con usuario | ✅ |
| POST | `/send` | Enviar mensaje (REST fallback) | ✅ |

---

## 🔔 NOTIFICATIONS (`/notifications` y `/api/notifications`)

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| GET | `/` | Obtener notificaciones | ✅ |
| PUT | `/:id/read` | Marcar como leída | ✅ |
| PUT | `/read-all` | Marcar todas como leídas | ✅ |
| DELETE | `/:id` | Eliminar notificación | ✅ |
| DELETE | `/clear/read` | Limpiar leídas | ✅ |
| POST | `/send` | Enviar notificación (admin) | ✅ |
| POST | `/broadcast` | Broadcast a todos (admin) | ✅ |

---

## 👨‍💼 ADMIN (`/admin` y `/api/admin`)

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| GET | `/dashboard` | Estadísticas del dashboard | ✅ |
| GET | `/users` | Obtener usuarios | ✅ |
| POST | `/users` | Crear usuario | ✅ |
| PUT | `/users/:id` | Actualizar usuario | ✅ |
| DELETE | `/users/:id` | Eliminar usuario | ✅ |
| GET | `/registration-requests` | Obtener solicitudes de registro | ✅ |
| POST | `/register-user` | Registrar usuario desde solicitud | ✅ |
| GET | `/memberships` | Obtener membresías | ✅ |
| GET | `/memberships/:id` | Obtener membresía específica | ✅ |
| POST | `/memberships` | Crear membresía | ✅ |
| PUT | `/memberships/:id` | Actualizar membresía | ✅ |
| DELETE | `/memberships/:id` | Eliminar membresía | ✅ |
| POST | `/attendance/checkin` | Registrar entrada | ✅ |
| POST | `/attendance/checkout` | Registrar salida | ✅ |
| GET | `/attendance` | Obtener registros de asistencia | ✅ |
| GET | `/attendance/stats` | Estadísticas de asistencia | ✅ |
| GET | `/reports/attendance` | Reporte de asistencia | ✅ |
| GET | `/reports/memberships` | Reporte de membresías | ✅ |

---

## 🏥 HEALTH CHECK

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| GET | `/health` | Health check sin prefijo | ✅ |
| GET | `/api/health` | Health check con prefijo | ✅ |

---

## ✅ VERIFICACIÓN FINAL

### Rutas Principales (9 módulos):
1. ✅ `/auth` → `/api/auth`
2. ✅ `/users` → `/api/users`
3. ✅ `/workouts` → `/api/workouts`
4. ✅ `/social` → `/api/social`
5. ✅ `/admin` → `/api/admin`
6. ✅ `/notifications` → `/api/notifications`
7. ✅ `/chat` → `/api/chat`
8. ✅ `/classes` → `/api/classes`
9. ✅ `/challenges` → `/api/challenges`

### Health Checks:
- ✅ `/health` → `/api/health`

---

## 📝 NOTAS IMPORTANTES

1. **Compatibilidad Total**: Todas las rutas funcionan con y sin el prefijo `/api`
2. **Autenticación**: La mayoría de las rutas requieren `authenticate` middleware
3. **Admin Only**: Las rutas de admin requieren `isAdmin` middleware
4. **Trainer/Admin**: Algunas rutas de clases requieren `isTrainerOrAdmin`
5. **Socket.io**: El chat también funciona con Socket.io para tiempo real

---

## 🎯 CONCLUSIÓN

**TODAS LAS RUTAS ESTÁN DISPONIBLES Y FUNCIONANDO CORRECTAMENTE**

El sistema está completamente configurado para funcionar tanto en desarrollo como en producción, con compatibilidad total para llamadas con y sin el prefijo `/api`.

