// Sound Manager - Gestor de reproducción de sonidos
import { getSettings } from './settingsManager';

class SoundManager {
    constructor() {
        this.sounds = {};
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        // Inicializar sonidos
        this.sounds = {
            move: new Audio('/sounds/move.mp3'),
            capture: new Audio('/sounds/capture.mp3'),
            check: new Audio('/sounds/check.mp3'),
            castle: new Audio('/sounds/castle.mp3'),
            promote: new Audio('/sounds/promote.mp3'),
            gameEnd: new Audio('/sounds/game-end.mp3'),
            notify: new Audio('/sounds/notify.mp3')
        };

        // Precargar todos los sonidos
        Object.values(this.sounds).forEach(sound => {
            sound.load();
        });

        this.initialized = true;
    }

    play(soundType, customVolume = null) {
        const settings = getSettings();

        // Verificar si los sonidos están habilitados
        if (!settings.sounds.enabled) return;

        // Verificar si este tipo de sonido específico está habilitado
        if (settings.sounds.types[soundType] === false) return;

        const sound = this.sounds[soundType];
        if (!sound) {
            console.warn(`Sound type "${soundType}" not found`);
            return;
        }

        try {
            // Establecer volumen
            const volume = customVolume !== null ? customVolume : settings.sounds.volume;
            sound.volume = Math.max(0, Math.min(1, volume));

            // Reiniciar y reproducir
            sound.currentTime = 0;
            sound.play().catch(e => {
                console.log('Audio play failed:', e.message);
            });
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
}

// Exportar instancia singleton
export const soundManager = new SoundManager();

// Inicializar en la primera interacción del usuario
export const initSounds = () => {
    soundManager.init();
};
