import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { soundManager } from '../utils/soundManager';
import '../styles/Settings.css';

import { googleDriveService } from '../services/googleDrive';

const Settings = ({ onClose }) => {
    const { settings, updateSettings, updateSoundSettings, updateGameplaySettings, updateAnalysisSettings, updateAntiCheatSettings } = useSettings();
    const [activeTab, setActiveTab] = useState('sounds');
    const [backupStatus, setBackupStatus] = useState(null); // 'loading', 'success', 'error'
    const [errorMessage, setErrorMessage] = useState('');

    const handleTestSound = (soundType) => {
        soundManager.play(soundType);
    };

    const handleUploadBackup = async () => {
        setBackupStatus('loading');
        try {
            const backupData = {
                settings: settings,
                timestamp: Date.now(),
                version: '1.0'
            };
            await googleDriveService.uploadBackup(backupData);
            setBackupStatus('success');
            setTimeout(() => setBackupStatus(null), 3000);
        } catch (error) {
            console.error(error);
            setBackupStatus('error');
            setErrorMessage(error.message);
        }
    };

    const handleRestoreBackup = async () => {
        setBackupStatus('loading');
        try {
            const data = await googleDriveService.restoreBackup();
            if (data && data.settings) {
                // Update settings using the context method which merges and saves
                updateSettings(data.settings);

                setBackupStatus('success');
                setTimeout(() => setBackupStatus(null), 3000);
            }
        } catch (error) {
            console.error(error);
            setBackupStatus('error');
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>⚙️ Configuración</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Tabs */}
                <div className="settings-tabs">
                    <button
                        className={activeTab === 'sounds' ? 'active' : ''}
                        onClick={() => setActiveTab('sounds')}
                    >
                        🔊 Sonidos
                    </button>
                    <button
                        className={activeTab === 'gameplay' ? 'active' : ''}
                        onClick={() => setActiveTab('gameplay')}
                    >
                        🎮 Juego
                    </button>
                    <button
                        className={activeTab === 'analysis' ? 'active' : ''}
                        onClick={() => setActiveTab('analysis')}
                    >
                        🔬 Análisis
                    </button>
                    <button
                        className={activeTab === 'anticheat' ? 'active' : ''}
                        onClick={() => setActiveTab('anticheat')}
                    >
                        🛡️ Anti-Trampas
                    </button>
                    <button
                        className={activeTab === 'backup' ? 'active' : ''}
                        onClick={() => setActiveTab('backup')}
                    >
                        💾 Nube
                    </button>
                </div>

                {/* Content */}
                <div className="settings-content">
                    {/* SONIDOS */}
                    {activeTab === 'sounds' && (
                        <div className="settings-section">
                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.sounds.enabled}
                                        onChange={(e) => updateSoundSettings({ enabled: e.target.checked })}
                                    />
                                    Habilitar sonidos
                                </label>
                            </div>

                            <div className="setting-item">
                                <label>Volumen: {Math.round(settings.sounds.volume * 100)}%</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.sounds.volume * 100}
                                    onChange={(e) => updateSoundSettings({ volume: e.target.value / 100 })}
                                    disabled={!settings.sounds.enabled}
                                />
                            </div>

                            <h4>Tipos de sonidos</h4>
                            {Object.keys(settings.sounds.types).map(type => (
                                <div key={type} className="setting-item sound-type">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={settings.sounds.types[type]}
                                            onChange={(e) => updateSoundSettings({
                                                types: { ...settings.sounds.types, [type]: e.target.checked }
                                            })}
                                            disabled={!settings.sounds.enabled}
                                        />
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </label>
                                    <button
                                        className="test-sound-btn"
                                        onClick={() => handleTestSound(type)}
                                        disabled={!settings.sounds.enabled || !settings.sounds.types[type]}
                                    >
                                        🔊 Probar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* GAMEPLAY */}
                    {activeTab === 'gameplay' && (
                        <div className="settings-section">
                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.gameplay.premove}
                                        onChange={(e) => updateGameplaySettings({ premove: e.target.checked })}
                                    />
                                    Premove (hacer movimiento antes del turno)
                                </label>
                            </div>

                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.gameplay.autoPromoteToQueen}
                                        onChange={(e) => updateGameplaySettings({ autoPromoteToQueen: e.target.checked })}
                                    />
                                    Auto-promoción a Reina
                                </label>
                            </div>

                            {!settings.gameplay.autoPromoteToQueen && (
                                <div className="setting-item">
                                    <label>Pieza de promoción por defecto:</label>
                                    <select
                                        value={settings.gameplay.promotionPiece}
                                        onChange={(e) => updateGameplaySettings({ promotionPiece: e.target.value })}
                                    >
                                        <option value="q">♕ Reina</option>
                                        <option value="r">♖ Torre</option>
                                        <option value="b">♗ Alfil</option>
                                        <option value="n">♘ Caballo</option>
                                    </select>
                                </div>
                            )}

                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.gameplay.showLegalMoves}
                                        onChange={(e) => updateGameplaySettings({ showLegalMoves: e.target.checked })}
                                    />
                                    Mostrar movimientos legales
                                </label>
                            </div>

                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.gameplay.highlightLastMove}
                                        onChange={(e) => updateGameplaySettings({ highlightLastMove: e.target.checked })}
                                    />
                                    Resaltar último movimiento
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ANÁLISIS */}
                    {activeTab === 'analysis' && (
                        <div className="settings-section">
                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.analysis.enabled}
                                        onChange={(e) => updateAnalysisSettings({ enabled: e.target.checked })}
                                    />
                                    Habilitar análisis con Stockfish
                                </label>
                                <p className="setting-description">
                                    Analiza tus partidas en segundo plano para mostrarte un reporte al finalizar.
                                </p>
                            </div>

                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.analysis.autoAnalyzeGames}
                                        onChange={(e) => updateAnalysisSettings({ autoAnalyzeGames: e.target.checked })}
                                        disabled={!settings.analysis.enabled}
                                    />
                                    Auto-analizar partidas
                                </label>
                                <p className="setting-description">
                                    Analiza automáticamente cada partida que juegues.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ANTI-TRAMPAS */}
                    {activeTab === 'anticheat' && (
                        <div className="settings-section">
                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.antiCheat.enabled}
                                        onChange={(e) => updateAntiCheatSettings({ enabled: e.target.checked })}
                                    />
                                    Habilitar sistema anti-trampas
                                </label>
                            </div>

                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.antiCheat.trackTabSwitches}
                                        onChange={(e) => updateAntiCheatSettings({ trackTabSwitches: e.target.checked })}
                                        disabled={!settings.antiCheat.enabled}
                                    />
                                    Detectar cambios de pestaña
                                </label>
                                <p className="setting-description">
                                    Monitorea cuando sales de la app durante la partida.
                                </p>
                            </div>

                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.antiCheat.alertOpponent}
                                        onChange={(e) => updateAntiCheatSettings({ alertOpponent: e.target.checked })}
                                        disabled={!settings.antiCheat.enabled}
                                    />
                                    Alertar al oponente
                                </label>
                                <p className="setting-description">
                                    Notifica a tu oponente si detecta comportamiento sospechoso.
                                </p>
                            </div>

                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.antiCheat.autoDisableAnalysisInP2P}
                                        onChange={(e) => updateAntiCheatSettings({ autoDisableAnalysisInP2P: e.target.checked })}
                                        disabled={!settings.antiCheat.enabled}
                                    />
                                    Desactivar análisis automáticamente en partidas P2P
                                </label>
                                <p className="setting-description">
                                    Para evitar tentaciones de hacer trampa.
                                </p>
                            </div>

                            <div className="setting-item">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={settings.antiCheat.engineDetection}
                                        onChange={(e) => updateAntiCheatSettings({ engineDetection: e.target.checked })}
                                        disabled={!settings.antiCheat.enabled}
                                    />
                                    Detección de uso de motor
                                </label>
                                <p className="setting-description">
                                    Analiza la precisión de movimientos para detectar posible uso de motor de ajedrez.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* BACKUP */}
                    {activeTab === 'backup' && (
                        <div className="settings-section">
                            <div className="setting-item" style={{ textAlign: 'center', padding: '1rem' }}>
                                <p style={{ marginBottom: '1rem' }}>
                                    Guarda tu configuración y progreso en tu Google Drive personal.
                                </p>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn-primary"
                                        onClick={handleUploadBackup}
                                        disabled={backupStatus === 'loading'}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        💾 Guardar en Drive
                                    </button>

                                    <button
                                        className="btn-secondary"
                                        onClick={handleRestoreBackup}
                                        disabled={backupStatus === 'loading'}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        📥 Restaurar desde Drive
                                    </button>
                                </div>

                                {backupStatus === 'loading' && <p style={{ marginTop: '1rem', color: '#aaa' }}>Cargando...</p>}
                                {backupStatus === 'success' && <p style={{ marginTop: '1rem', color: '#4ade80' }}>✅ Operación exitosa</p>}
                                {backupStatus === 'error' && <p style={{ marginTop: '1rem', color: '#ef4444' }}>❌ Error: {errorMessage}</p>}

                                {!sessionStorage.getItem('google_access_token') && (
                                    <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#eab308' }}>
                                        ⚠️ Debes iniciar sesión con Google para usar esta función.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="settings-footer">
                    <button className="btn-primary" onClick={onClose}>
                        Guardar y Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
