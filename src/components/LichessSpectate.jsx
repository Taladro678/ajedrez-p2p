import React, { useState, useEffect } from 'react';
import { lichessApi } from '../services/lichess';

const LichessSpectate = ({ onWatch }) => {
    const [tvChannels, setTvChannels] = useState({});
    const [ongoingGames, setOngoingGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load TV channels
            const channels = await lichessApi.getTvChannels();
            setTvChannels(channels);

            // Load ongoing games (if user is logged in)
            try {
                const games = await lichessApi.getOngoingGames();
                setOngoingGames(games.nowPlaying || []);
            } catch (e) {
                // User might not be logged in or no games
                console.log('No ongoing games');
            }
        } catch (err) {
            console.error('Error loading spectate data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleWatch = (gameId) => {
        if (onWatch) {
            onWatch(gameId);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                Cargando partidas...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '1rem' }}>
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#ef4444'
                }}>
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '1rem' }}>
            {/* TV Channels */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>📺 Canales TV de Lichess</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1rem'
                }}>
                    {Object.entries(tvChannels).map(([channelName, channelData]) => (
                        <div
                            key={channelName}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '1rem',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            }}
                            onClick={() => handleWatch(channelData.gameId)}
                        >
                            <div style={{
                                fontSize: '0.85rem',
                                color: '#94a3b8',
                                marginBottom: '0.5rem',
                                textTransform: 'capitalize'
                            }}>
                                {channelName.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.75rem'
                            }}>
                                <div style={{ fontSize: '0.9rem' }}>
                                    <div><strong>{channelData.user?.name || 'Jugador 1'}</strong></div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                        {channelData.user?.rating || '?'}
                                    </div>
                                </div>
                                <div style={{ color: '#94a3b8' }}>vs</div>
                                <div style={{ fontSize: '0.9rem', textAlign: 'right' }}>
                                    <div><strong>{channelData.opponent?.name || 'Jugador 2'}</strong></div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                        {channelData.opponent?.rating || '?'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleWatch(channelData.gameId);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: '#3b82f6',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
                            >
                                👁️ Observar
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ongoing Games */}
            {ongoingGames.length > 0 && (
                <div>
                    <h3 style={{ marginBottom: '1rem' }}>🎮 Tus Partidas en Curso</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {ongoingGames.map(game => (
                            <div
                                key={game.gameId}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div>
                                    <div style={{ marginBottom: '0.25rem' }}>
                                        <strong>{game.opponent?.username || 'Oponente'}</strong>
                                        {game.opponent?.rating && (
                                            <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>
                                                ({game.opponent.rating})
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                        {game.isMyTurn ? '🟢 Tu turno' : '⏳ Esperando'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleWatch(game.gameId)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: '#22c55e',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#16a34a'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#22c55e'}
                                >
                                    {game.isMyTurn ? '▶️ Jugar' : '👁️ Ver'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LichessSpectate;
