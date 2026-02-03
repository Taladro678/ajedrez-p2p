// Sound Manager - Gestor de reproducción de sonidos
import { getSettings } from './settingsManager';
import { Capacitor } from '@capacitor/core';

class SoundManager {
    constructor() {
        this.sounds = {};
        this.initialized = false;
        this.audioContext = null;
    }

    init() {
        if (this.initialized) return;

        console.log('🔈 Inicializando gestor de sonidos...');

        // Rutas de sonidos - Usamos rutas relativas para compatibilidad con Capacitor
        const soundPaths = {
            move: '/sounds/move.mp3',
            capture: '/sounds/capture.mp3',
            check: '/sounds/check.mp3',
            castle: '/sounds/move.mp3', // castle.mp3 is missing
            promote: '/sounds/move.mp3', // promote.mp3 is missing
            gameEnd: '/sounds/notify.mp3', // game-end.mp3 is missing
            notify: '/sounds/notify.mp3',
            win: '/sounds/win.mp3',
            lose: '/sounds/lose.mp3',
            draw: '/sounds/draw.mp3'
        };

        // Inicializar objetos Audio
        Object.entries(soundPaths).forEach(([key, path]) => {
            try {
                const audio = new Audio();
                audio.src = path;
                audio.preload = 'auto';
                this.sounds[key] = audio;
            } catch (e) {
                console.error(`Error cargando sonido ${key}:`, e);
            }
        });

        this.initialized = true;
    }

    play(soundType, customVolume = null) {
        // En Android/Capacitor, a veces necesitamos forzar la inicialización en la primera reproducción
        if (!this.initialized) this.init();

        const settings = getSettings();
        if (!settings.sounds.enabled) return;
        if (settings.sounds.types && settings.sounds.types[soundType] === false) return;

        const sound = this.sounds[soundType];
        if (!sound) {
            console.warn(`Sound type "${soundType}" not found`);
            return;
        }

        try {
            const volume = customVolume !== null ? customVolume : settings.sounds.volume;
            sound.volume = Math.max(0, Math.min(1, volume));

            // Reiniciar y reproducir
            sound.currentTime = 0;
            const playPromise = sound.play();

            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log('Audio play failed (interaction required?):', e.message);
                    // Fallback: tratar de recargar si falló
                    if (e.name === 'NotSupportedError' || e.name === 'NotAllowedError') {
                        sound.load();
                    }
                });
            }
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    // Métodos de conveniencia
    playMove() { this.play('move'); }
    playCapture() { this.play('capture'); }
    playCheck() { this.play('check'); }
    playCastle() { this.play('castle'); }
    playPromote() { this.play('promote'); }
    playGameEnd() { this.play('gameEnd'); }
    playNotify() { this.play('notify'); }
    playWin() { this.play('win'); }
    playLose() { this.play('lose'); }
    playDraw() { this.play('draw'); }
}

export const soundManager = new SoundManager();

export const initSounds = () => {
    soundManager.init();
};
