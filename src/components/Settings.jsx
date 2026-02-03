import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { soundManager } from '../utils/soundManager';
import '../styles/Settings.css';

import { googleDriveService } from '../services/googleDrive';
import { lichessAuth } from '../services/lichess';

const Settings = ({ onClose }) => {
    const { settings, updateSettings, updateSoundSettings, updateGameplaySettings, updateAnalysisSettings, updateAntiCheatSettings } = useSettings();
    const [activeTab, setActiveTab] = useState('sounds');
    const [backupStatus, setBackupStatus] = useState(null); // 'loading', 'success', 'error'
    const [errorMessage, setErrorMessage] = useState('');
    const [lichessTokenStatus, setLichessTokenStatus] = useState(null); // 'deleting', 'deleted', 'error'

    const handleTestSound = (soundType) => {
        soundManager.play(soundType);
    };

    const handleUploadBackup = async () => {
        setBackupStatus('loading');
        try {
            const history = JSON.parse(localStorage.getItem('chess_p2p_history') || '[]');
            const backupData = {
                settings: settings,
                history: history,
                timestamp: Date.now(),
                version: '1.5'
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
            if (data) {
                if (data.settings) updateSettings(data.settings);
                if (data.history) {
                    localStorage.setItem('chess_p2p_history', JSON.stringify(data.history));
                }

                setBackupStatus('success');
                setTimeout(() => setBackupStatus(null), 3000);
                alert('Historial y configuración restaurados correctamente.');
            }
        } catch (error) {
            console.error(error);
            setBackupStatus('error');
            setErrorMessage(error.message);
        }
    };

    const handleDeleteLichessToken = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar tu token de Lichess? Tendrás que volver a autenticarte la próxima vez que quieras jugar en Lichess.')) {
            return;
        }

        setLichessTokenStatus('deleting');
        try {
            await lichessAuth.deleteTokenCompletely();
            setLichessTokenStatus('deleted');
            setTimeout(() => setLichessTokenStatus(null), 3000);
        } catch (error) {
            console.error(error);
            setLichessTokenStatus('error');
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
                                <h3 style={{ marginBottom: '0.5rem' }}>💾 Configuración y Progreso</h3>
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
                                    <div style={{
                                        marginTop: '1.5rem',
                                        padding: '1rem',
                                        background: 'rgba(234, 179, 8, 0.1)',
                                        border: '1px solid rgba(234, 179, 8, 0.3)',
                                        borderRadius: '8px',
                                        textAlign: 'left'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#eab308', display: 'flex', gap: '8px' }}>
                                            <span>⚠️</span>
                                            <strong>Atención:</strong> Tu historial y preferencias se guardan solo en este navegador.
                                        </p>
                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#aaa' }}>
                                            Si cambias de dispositivo, desinstalas la app o borras los datos del navegador, <strong>perderás todo tu progreso</strong>.
                                        </p>
                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#aaa' }}>
                                            Conecta tu Google Drive para mantener tus partidas sincronizadas.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Lichess Token Management */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
                                <div className="setting-item" style={{ textAlign: 'center', padding: '1rem' }}>
                                    <h3 style={{ marginBottom: '0.5rem' }}>♟️ Token de Lichess</h3>
                                    <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                        Tu token de Lichess se sincroniza automáticamente con Google Drive para que puedas acceder desde cualquier dispositivo.
                                    </p>
                                    <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#aaa' }}>
                                        Si deseas eliminar tu token guardado (local y en la nube), usa el botón de abajo.
                                    </p>

                                    <button
                                        onClick={handleDeleteLichessToken}
                                        disabled={lichessTokenStatus === 'deleting'}
                                        style={{
                                            padding: '0.6rem 1.2rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: '#ef4444',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.9rem'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                        }}
                                    >
                                        🗑️ Eliminar Token de Lichess
                                    </button>

                                    {lichessTokenStatus === 'deleting' && <p style={{ marginTop: '1rem', color: '#aaa' }}>Eliminando...</p>}
                                    {lichessTokenStatus === 'deleted' && <p style={{ marginTop: '1rem', color: '#4ade80' }}>✅ Token eliminado correctamente</p>}
                                    {lichessTokenStatus === 'error' && <p style={{ marginTop: '1rem', color: '#ef4444' }}>❌ Error: {errorMessage}</p>}
                                </div>
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
