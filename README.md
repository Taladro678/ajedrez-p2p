# Ajedrez P2P ♟️

**La experiencia definitiva de ajedrez descentralizado.**

Ajedrez P2P es una plataforma moderna y potente diseñada para entusiastas del ajedrez que buscan privacidad, rendimiento y herramientas de análisis avanzadas. A diferencia de las plataformas tradicionales, Ajedrez P2P utiliza tecnología Peer-to-Peer para conectar a los jugadores directamente, eliminando la necesidad de servidores intermediarios para la lógica del juego.

---

## 🚀 Características Principales

### 🤝 Conectividad P2P Real
Juega contra amigos o desconocidos con una conexión directa. Menos latencia, más privacidad y total independencia de servidores centrales de juego gracias a **PeerJS**.

### 🤖 Inteligencia Artificial y Análisis
- **Stockfish Integrado**: Desafía al motor de ajedrez más potente del mundo directamente en tu navegador.
- **Modo Análisis**: Revisa tus partidas del historial, analiza posiciones críticas y descubre los mejores movimientos sugeridos por la IA.

### 🌍 Social y Global
- **Chat Global**: Interactúa con la comunidad en tiempo real.
- **Traducción Automática**: Rompe las barreras del idioma con el sistema de traducción inteligente integrado en el chat.
- **Banderas de Países**: Detección automática de ubicación para una experiencia social más inmersiva.

### ☁️ Sincronización en la Nube
No pierdas nunca tu progreso. Ajedrez P2P se sincroniza automáticamente con tu cuenta de **Google Drive**, manteniendo tu historial de partidas y configuraciones seguras y accesibles desde cualquier dispositivo.

### 📱 Experiencia Móvil de Vanguardia
- **Capacitor & OTA**: Instalable en Android con actualizaciones **Over-The-Air (OTA)** automáticas. ¡Tu app siempre estará al día sin necesidad de descargar nuevos APKs manualmente!
- **Diseño Premium**: Interfaz fluida, animaciones micro-interactivas y efectos de sonido inmersivos.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React + Vite
- **Motor de Juego**: Chess.js + React-Chessboard
- **P2P**: PeerJS
- **Backend/Presencia**: Firebase (Auth & Firestore)
- **Persistencia**: Google Drive API + LocalStorage
- **Móvil**: Capacitor.js + Capgo (OTA Self-hosted)
- **Traducción**: MyMemory API

---

## 🏗️ Configuración de Desarrollo

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/Taladro678/ajedrez-p2p.git
    cd ajedrez-p2p
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Iniciar modo desarrollo**:
    ```bash
    npm run dev
    ```

---

## 📦 Despliegue y OTA

Este proyecto utiliza un sistema de **Autohospedaje de Actualizaciones (Self-Hosted OTA)**. Los cambios pusheados a la rama `main` disparan una GitHub Action que compila la versión estable y la pone a disposición de todos los clientes instalados automáticamente.

---

## 📝 Licencia

Este proyecto es privado. Todos los derechos reservados por el autor.

---

*Desarrollado con ❤️ para la comunidad global de ajedrez.*
