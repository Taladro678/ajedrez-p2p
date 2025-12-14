import React, { useEffect } from 'react';
import { useLichessEvents } from '../hooks/useLichessEvents';

const LichessChallenges = ({ onAccept }) => {
    const {
        challenges,
        isStreaming,
        error,
        startStream,
        stopStream,
        acceptChallenge,
        declineChallenge
    } = useLichessEvents();

    useEffect(() => {
        startStream();
        return () => stopStream();
    }, []);

    const handleAccept = async (challengeId) => {
        const success = await acceptChallenge(challengeId);
        if (success && onAccept) {
            // Find the challenge to get game info
            const challenge = challenges.find(c => c.id === challengeId);
            if (challenge && challenge.game) {
                onAccept(challenge.game.id);
            }
        }
    };

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <h3 style={{ margin: 0 }}>Retos de Lichess</h3>
                <div style={{
                    fontSize: '0.85rem',
                    color: isStreaming ? '#22c55e' : '#94a3b8'
                }}>
                    {isStreaming ? '🟢 Conectado' : '⚪ Desconectado'}
                </div>
            </div>

            {error && (
                <div style={{
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    marginBottom: '1rem',
                    fontSize: '0.9rem'
                }}>
                    Error: {error}
                </div>
            )}

            {challenges.length === 0 ? (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px'
                }}>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                        No hay retos pendientes
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                        Los retos aparecerán aquí automáticamente
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {challenges.map(challenge => (
                        <div
                            key={challenge.id}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    <strong style={{ fontSize: '1rem' }}>
                                        {challenge.challenger?.name || 'Jugador'}
                                    </strong>
                                    {challenge.challenger?.rating && (
                                        <span style={{
                                            color: '#94a3b8',
                                            fontSize: '0.9rem'
                                        }}>
                                            ({challenge.challenger.rating})
                                        </span>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: '#94a3b8',
                                    display: 'flex',
                                    gap: '0.75rem',
                                    flexWrap: 'wrap'
                                }}>
                                    {challenge.timeControl?.show && (
                                        <span>⏱️ {challenge.timeControl.show}</span>
                                    )}
                                    {challenge.rated !== undefined && (
                                        <span>{challenge.rated ? '📊 Rated' : '🎮 Casual'}</span>
                                    )}
                                    {challenge.variant?.name && challenge.variant.name !== 'Standard' && (
                                        <span>♟️ {challenge.variant.name}</span>
                                    )}
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginLeft: '1rem'
                            }}>
                                <button
                                    onClick={() => handleAccept(challenge.id)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: '#22c55e',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: '500',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#16a34a'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#22c55e'}
                                >
                                    ✓ Aceptar
                                </button>
                                <button
                                    onClick={() => declineChallenge(challenge.id)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '6px',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                        e.currentTarget.style.borderColor = '#ef4444';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                    }}
                                >
                                    ✗ Rechazar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LichessChallenges;
