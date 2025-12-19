# Fixes para Problemas de Deploy

## Problema: Login no funciona en producción

### Variables de Entorno Necesarias

#### Render (Backend) - VERIFICAR:
```
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://alien:alien@cluster0.xr01zqx.mongodb.net/altusGym?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=altus_secret_key_2024_production
CLIENT_URL=https://webaltusgym1.vercel.app
```

#### Vercel (Frontend) - VERIFICAR:
```
VITE_API_URL=https://altus-gym-server.onrender.com/api
```

**IMPORTANTE**: El valor debe ser la URL completa del backend en Render, incluyendo `/api` al final.

### Pasos para Diagnosticar

1. **Verificar que el backend responde:**
   - Abre: `https://altus-gym-server.onrender.com/api/health`
   - Debe responder: `{"status":"ok","timestamp":"..."}`

2. **Verificar logs en Render:**
   - Ve a tu proyecto en Render
   - Click en "Logs"
   - Busca mensajes que empiecen con:
     - `🔐 Login attempt:`
     - `✅ User found:`
     - `❌` (errores)

3. **Verificar CORS:**
   - En los logs de Render, busca: `🌐 Allowed CORS origins:`
   - Debe incluir: `https://webaltusgym1.vercel.app`

4. **Verificar la URL del API en el frontend:**
   - Abre la consola del navegador en Vercel
   - Busca errores de CORS o 401
   - Verifica que las peticiones vayan a: `https://altus-gym-server.onrender.com/api/auth/login`

### Comandos para Aplicar Fixes

```bash
# Agregar los cambios
git add server/src/index.js server/src/routes/auth.js

# Commit
git commit -m "fix: Mejorar CORS, logging y manejo de errores para producción"

# Push
git push origin main
```

### Después del Push

1. Render se redeployará automáticamente
2. Espera 2-3 minutos
3. Verifica los logs en Render para ver los nuevos mensajes de debug
4. Intenta hacer login nuevamente
5. Revisa los logs para ver qué está pasando

