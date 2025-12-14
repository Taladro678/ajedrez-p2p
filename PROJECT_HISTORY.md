# Historial y Estado del Proyecto

**Última Actualización:** 14 de diciembre de 2024 (11:40 AM)
**Proyecto:** Ajedrez P2P + Integración con Lichess
**Repositorio:** [https://github.com/Taladro678/ajedrez-p2p](https://github.com/Taladro678/ajedrez-p2p)
**URL Desplegada:** [https://ajedrez-p2p.vercel.app](https://ajedrez-p2p.vercel.app)

## Contexto para Asistentes de IA
Si eres un asistente de IA reanudando el trabajo en este proyecto, por favor lee este archivo para entender el estado actual.

### 1. Características Principales
*   **Ajedrez P2P**: Conexión peer-to-peer basada en PeerJS.
*   **Stockfish**: Oponente de IA local.
*   **Integración con Lichess**:
    *   **Arquitectura**: Usa un adaptador `LichessConnection` para imitar las conexiones de PeerJS.
    *   **Autenticación**: Cambio de "OAuth Code Flow" a flujo de **Token de Acceso Personal Manual**.
    *   **Razón**: Lichess restringió el registro público de aplicaciones OAuth. Los usuarios deben generar un token con el scope `board:play` en `https://lichess.org/account/oauth/token/create` y pegarlo en la aplicación.
    *   **Almacenamiento**: El token se almacena en `localStorage` ('lichess_token').

### 2. Cambios Recientes
*   Corregido `auth/unauthorized-domain` en Firebase para Vercel.
*   Implementada PWA (manifest, iconos).
*   Optimizado CSS para móviles (`100dvh`).
*   **Crítico**: Modificado `src/components/Lobby.jsx` para mostrar un campo de entrada de token manual en lugar del botón "Login with Lichess" cuando no hay token presente.
*   **Crítico**: Actualizado `src/services/lichess.js` para soportar este flujo (aunque `login()` está mayormente deprecado/sin uso en la UI).

### 3. Instrucciones de Uso
*   **Nueva Sesión**: Para reanudar debugging o desarrollo, verificar `git status`. La rama `main` es la fuente de verdad.
*   **Despliegue**: Las actualizaciones se envían a GitHub y se despliegan automáticamente en Vercel.

## Estado de Tareas
- [x] Integrar API de Lichess (Matchmaking y Game Stream)
- [x] Optimización Móvil (CSS)
- [x] Configuración PWA
- [x] Despliegue en Vercel
- [x] Corregir Problemas de Dominio de Autenticación
- [x] Implementar Fallback de Token Manual para Lichess

## Cambios Recientes (14 de diciembre de 2024)

### Nuevas Funcionalidades
*   **Landing Page**: Nueva página de inicio antes de la autenticación
*   **Video Chat**: Integración de videollamadas durante las partidas P2P
*   **Mensajes de Voz**: Capacidad de enviar mensajes de voz en el chat
*   **Google Analytics**: Integración para estadísticas de uso
*   **Google Drive Backup**: Sistema de respaldo automático de partidas

### Correcciones de Build ✅
*   **Problema**: Build fallaba con "Adjacent JSX elements must be wrapped in an enclosing tag"
*   **Causa**: Elementos JSX adyacentes sin envolver en `Lobby.jsx` líneas 313-376
*   **Solución**: Envueltos elementos en React Fragment `<>...</>`
*   **Commit**: `9697459`
*   **Resultado**: ✅ Build exitoso, aplicación funcionando correctamente

### Correcciones de Código
*   Corregidos errores de React Hooks en `App.jsx`
*   Agregado script `build` en `package.json`
*   Restaurado import de `Auth` necesario para `LandingPage`
*   **Corregido error JSX en `Lobby.jsx`** - elementos adyacentes envueltos en fragmento

## Problemas Conocidos / Notas
*   **OAuth de Lichess**: El flujo estándar de OAuth App está deshabilitado en favor de Tokens Personales debido a restricciones de registro. No intentar revertir al flujo basado en "Client ID" a menos que la política de Lichess cambie.
*   **Archivos**:
    *   `src/components/Lobby.jsx`: Lógica principal de UI para la conexión.
    *   `src/services/lichess.js`: Wrapper de la API.

## Estado del Asistente AI
**Fecha de Actualización:** 14 de diciembre de 2024, 11:40 AM

✅ **Asistente al tanto del proyecto**
- He revisado completamente el historial del proyecto
- Entiendo la arquitectura P2P + Lichess Integration
- Conozco el cambio crítico de OAuth a Personal Access Tokens
- Familiarizado con los archivos principales (`Lobby.jsx`, `lichess.js`)
- Listo para ayudar con nuevas funcionalidades, debugging o mejoras

**Próximos pasos sugeridos:**
- Implementar nuevas características según necesidades
- Optimizaciones de rendimiento
- Mejoras en la experiencia de usuario
- Corrección de bugs reportados
