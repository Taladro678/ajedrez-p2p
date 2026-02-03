import React, { useState, useEffect } from 'react';
import { googleDriveService } from '../services/googleDrive';

const GameHistory = ({ onClose, onAnalyze }) => {
    const [history, setHistory] = useState([]);
    const [copiedIndex, setCopiedIndex] = useState(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('chess_p2p_history');
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    const handleCopyPGN = (pgn, index) => {
        navigator.clipboard.writeText(pgn);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleClearHistory = async () => {
        if (confirm('¿Estás seguro de borrar todo el historial?')) {
            localStorage.removeItem('chess_p2p_history');
            setHistory([]);

            // Sync with Drive if available
            if (sessionStorage.getItem('google_access_token')) {
                try {
                    const settings = JSON.parse(localStorage.getItem('chess_settings') || '{}');
                    await googleDriveService.syncAppData([], settings);
                } catch (error) {
                    console.error('Error syncing cleared history:', error);
                }
            }
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.95)',
            zIndex: 3000,
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            overflowY: 'auto'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '1rem'
            }}>
                <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📜 Historial de Partidas
                </h2>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ✕
                </button>
            </div>

            {history.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                    <p>No hay partidas guardadas aún.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {history.map((game, i) => (
                        <div key={i} style={{
                            background: '#1e293b',
                            borderRadius: '12px',
                            padding: '1rem',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#94a3b8' }}>
                                <span>📅 {new Date(game.date).toLocaleString()}</span>
                                <span style={{
                                    textTransform: 'uppercase',
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: game.mode === 'p2p' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                    color: game.mode === 'p2p' ? '#4ade80' : '#60a5fa'
                                }}>
                                    {game.mode}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{ color: 'white', fontWeight: 'bold' }}>⚪ {game.white}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ color: '#ccc', fontWeight: 'bold' }}>⚫{game.black}</span>
                                    </div>
                                </div>
                                <div style={{
                                    textAlign: 'right',
                                    color: game.result.includes('Blancas') ? '#fff' : game.result.includes('Negras') ? '#ccc' : '#fbbf24',
                                    fontWeight: 'bold'
                                }}>
                                    {game.result.includes('win') ? 'Victoria' : game.result}
                                </div>
                            </div>

                            <div style={{
                                marginTop: '0.5rem',
                                paddingTop: '0.5rem',
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                gap: '0.5rem'
                            }}>
                                <button
                                    onClick={() => handleCopyPGN(game.pgn, i)}
                                    style={{
                                        flex: 1,
                                        background: copiedIndex === i ? '#22c55e' : '#334155',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {copiedIndex === i ? '✅ Copiado' : '📋 Copiar PGN'}
                                </button>
                                <button
                                    onClick={() => onAnalyze && onAnalyze(game.pgn, game.white.includes('Yo') || game.white === localStorage.getItem('chess_playerName') ? 'white' : 'black')}
                                    style={{
                                        flex: 1,
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    🔍 Analizar
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleClearHistory}
                        style={{
                            marginTop: '2rem',
                            background: 'transparent',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        🗑️ Borrar Historial
                    </button>
                </div>
            )}
        </div>
    );
};

export default GameHistory;
