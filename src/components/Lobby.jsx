import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Settings from './Settings';
import { lichessAuth, lichessApi } from '../services/lichess';
import LichessChallenges from './LichessChallenges';
import LichessSpectate from './LichessSpectate';

const Lobby = ({ onConnect, myId, user }) => {
    const [gameMode, setGameMode] = useState('p2p');
    const [color, setColor] = useState('white');
    const [timeControl, setTimeControl] = useState('10+0');
    const [customTime, setCustomTime] = useState(10);
    const [customInc, setCustomInc] = useState(0);
    const [elo, setElo] = useState(1200);

    // Lichess State
    const [lichessToken, setLichessToken] = useState(lichessAuth.getToken());
    const [isSearchingLichess, setIsSearchingLichess] = useState(false);
    const [lichessTab, setLichessTab] = useState('create'); // 'create', 'challenges', 'spectate'

    // Initialize playerName - prioritize user.displayName
    const [playerName, setPlayerName] = useState(() => {
        if (user?.displayName) return user.displayName;
        return localStorage.getItem('chess_playerName') || 'Jugador ' + Math.floor(Math.random() * 1000);
    });

    // Update playerName when user changes
    useEffect(() => {
        if (user?.displayName) {
            setPlayerName(user.displayName);
        }
    }, [user]);

    // Save playerName to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('chess_playerName', playerName);
    }, [playerName]);

    // Get user's country based on IP
    const [userCountry, setUserCountry] = useState(null);
    useEffect(() => {
        fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
                setUserCountry(data.country_code); // Ej: "US", "MX", "DO"
            })
            .catch(err => {
                console.error('Error getting country:', err);
                setUserCountry(null);
            });
    }, []);

    const [games, setGames] = useState([]);
    const [isHosting, setIsHosting] = useState(false);
    const [hostedGameId, setHostedGameId] = useState(null);
    const [sortBy, setSortBy] = useState('recent'); // recent, time-asc, time-desc
    const [showStatusTooltip, setShowStatusTooltip] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('good'); // good, slow, offline
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [showDonate, setShowDonate] = useState(false);
    const [publishMessage, setPublishMessage] = useState(null); // Mensaje al publicar reto

    // Global Chat State
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [onlineUsers, setOnlineUsers] = useState(0);
    const [showChat, setShowChat] = useState(true);

    useEffect(() => {
        // Listen for available games
        const q = query(collection(db, "games"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const TWO_HOURS = 2 * 60 * 60 * 1000;

            let gamesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
                .filter(g => {
                    // Only show waiting games
                    if (g.status && g.status !== 'waiting') return false;
                    // Filter out games older than 2 hours
                    if (g.createdAt && (now - g.createdAt) > TWO_HOURS) {
                        // Delete old game
                        deleteDoc(doc(db, "games", g.id)).catch(e => console.error("Error deleting old game:", e));
                        return false;
                    }
                    return true;
                });

            // Sort based on selection
            if (sortBy === 'recent') {
                gamesList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            } else if (sortBy === 'time-asc') {
                gamesList.sort((a, b) => {
                    const timeA = parseInt(a.timeControl?.split('+')[0] || 10);
                    const timeB = parseInt(b.timeControl?.split('+')[0] || 10);
                    return timeA - timeB;
                });
            } else if (sortBy === 'time-desc') {
                gamesList.sort((a, b) => {
                    const timeA = parseInt(a.timeControl?.split('+')[0] || 10);
                    const timeB = parseInt(b.timeControl?.split('+')[0] || 10);
                    return timeB - timeA;
                });
            }

            setGames(gamesList);
        });

        return () => unsubscribe();
    }, [sortBy]);

    // Detectar cuando alguien acepta la partida del host
    useEffect(() => {
        if (!isHosting || !hostedGameId) return;

        const unsubscribe = onSnapshot(doc(db, "games", hostedGameId), (docSnap) => {
            if (!docSnap.exists()) {
                // La partida fue eliminada (alguien la aceptó)
                // Esperar conexión entrante via PeerJS
                setIsHosting(false);
                setHostedGameId(null);
                setPublishMessage('🎮 ¡Alguien aceptó tu reto! Iniciando partida...');
                setTimeout(() => setPublishMessage(null), 3000);
            }
        });

        return () => unsubscribe();
    }, [isHosting, hostedGameId]);

    // Monitor connection status with real quality detection
    useEffect(() => {
        const updateConnectionStatus = async () => {
            // First check if browser is online
            if (!navigator.onLine) {
                setConnectionStatus('offline');
                return;
            }

            // Check Network Information API for connection type
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

            if (connection) {
                // Check effective connection type
                const effectiveType = connection.effectiveType;

                // Slow connection types: slow-2g, 2g, 3g
                if (effectiveType === 'slow-2g' || effectiveType === '2g') {
                    setConnectionStatus('slow');
                    return;
                }

                // Check if connection is metered or has data saver enabled
                if (connection.saveData) {
                    setConnectionStatus('slow');
                    return;
                }
            }

            // Measure actual latency by checking Firebase response time
            try {
                const startTime = performance.now();

                // Quick Firebase read to measure latency (using modular API)
                const q = query(collection(db, 'games'));
                await getDocs(q);

                const latency = performance.now() - startTime;

                // Set status based on latency
                if (latency > 2000) {
                    // More than 2 seconds = slow
                    setConnectionStatus('slow');
                } else {
                    setConnectionStatus('good');
                }
            } catch (error) {
                // If Firebase fails, mark as slow
                console.error('Connection check failed:', error);
                setConnectionStatus('slow');
            }
        };

        // Initial check
        updateConnectionStatus();

        // Periodic check every 30 seconds
        const interval = setInterval(updateConnectionStatus, 30000);

        // Listen for online/offline events
        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);

        // Listen for connection changes (if supported)
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            connection.addEventListener('change', updateConnectionStatus);
        }

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', updateConnectionStatus);
            window.removeEventListener('offline', updateConnectionStatus);
            if (connection) {
                connection.removeEventListener('change', updateConnectionStatus);
            }
        };
    }, []); // No dependencies needed

    // Close tooltip when clicking outside
    useEffect(() => {
        if (!showStatusTooltip) return;

        const handleClickOutside = (event) => {
            // Check if click is outside the tooltip and indicator
            const tooltipElement = event.target.closest('[data-connection-indicator]');
            if (!tooltipElement) {
                setShowStatusTooltip(false);
            }
        };

        // Add listener with a small delay to avoid immediate closing
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showStatusTooltip]);

    // User Presence Tracking
    useEffect(() => {
        if (!myId || !playerName) return;

        const presenceRef = doc(db, 'presence', myId);

        // Set user as online
        const setPresence = async () => {
            try {
                await setDoc(presenceRef, {
                    userId: myId,
                    name: playerName,
                    country: userCountry,
                    timestamp: Date.now(),
                    status: 'online'
                });
            } catch (error) {
                console.error('Error setting presence:', error);
            }
        };

        setPresence();

        // Update presence every 30 seconds
        const interval = setInterval(() => {
            updateDoc(presenceRef, { timestamp: Date.now() }).catch(err =>
                console.error('Error updating presence:', err)
            );
        }, 30000);

        // Cleanup on unmount
        return () => {
            clearInterval(interval);
            deleteDoc(presenceRef).catch(err => console.error('Error removing presence:', err));
        };
    }, [myId, playerName, userCountry]);

    // Listen to online users count
    useEffect(() => {
        const q = query(collection(db, 'presence'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const activeUsers = snapshot.docs.filter(doc => {
                const data = doc.data();
                // Consider active if updated in last 60 seconds
                return (now - data.timestamp) < 60000;
            });
            setOnlineUsers(activeUsers.length);
        });

        return () => unsubscribe();
    }, []);

    // Listen to global chat messages
    useEffect(() => {
        const q = query(
            collection(db, 'globalChat'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).reverse(); // Reverse to show oldest first
            setChatMessages(messages);
        });

        return () => unsubscribe();
    }, []);

    const handleCreateGame = async () => {
        const settings = {
            gameMode,
            color: color === 'random' ? (Math.random() > 0.5 ? 'white' : 'black') : color,
            timeControl: timeControl === 'custom' ? customTime + '+' + customInc : timeControl,
            elo: parseInt(elo)
        };

        if (gameMode === 'computer') {
            onConnect('COMPUTER', settings);
        } else if (gameMode === 'lichess') {
            // Lichess Logic
            if (!lichessToken) {
                lichessAuth.login();
                return;
            }

            setIsSearchingLichess(true);
            let searchTimeout;
            try {
                // Parse time control
                const [min, inc] = settings.timeControl.split('+').map(Number);
                console.log('Creating Lichess seek:', { time: min, increment: inc, color });

                const response = await lichessApi.createOpenChallenge({
                    time: min,
                    increment: inc,
                    color: color
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Lichess API error:', errorText);
                    throw new Error("Error starting seek: " + errorText);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                // Timeout after 60 seconds
                searchTimeout = setTimeout(() => {
                    reader.cancel();
                    setIsSearchingLichess(false);
                    alert('No se encontró oponente. Intenta de nuevo.');
                }, 60000);

                // Read stream for match
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    console.log("Lichess Seek Stream:", chunk);

                    try {
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (!line.trim()) continue;
                            const event = JSON.parse(line);
                            console.log('Lichess event:', event);
                            if (event.type === 'gameStart') {
                                clearTimeout(searchTimeout);
                                setIsSearchingLichess(false);
                                onConnect('lichess:' + event.game.id, settings);
                                return;
                            }
                        }
                    } catch (e) { console.error('Parse error:', e); }
                }
            } catch (e) {
                clearTimeout(searchTimeout);
                console.error("Lichess error:", e);
                alert("Error connecting to Lichess: " + e.message);
                setIsSearchingLichess(false);
            }

        } else {
            // P2P: Create Public Game in Firebase
            if (!myId) return alert('Esperando ID de red...');

            try {
                const docRef = await addDoc(collection(db, "games"), {
                    hostId: myId,
                    name: playerName,
                    hostName: playerName,  // Nombre real del host
                    country: userCountry,   // Código de país
                    elo: '1200?',
                    timeControl: settings.timeControl,
                    color: settings.color,
                    status: 'waiting',
                    createdAt: Date.now()
                });

                // Mantener en lobby y mostrar mensaje
                setIsHosting(true);
                setHostedGameId(docRef.id);
                setPublishMessage(`✅ Reto publicado! Esperando oponente...`);
                setTimeout(() => setPublishMessage(null), 5000);

                // NO llamar onConnect aquí - esperar a que alguien acepte
            } catch (e) {
                console.error("Error adding document: ", e);
                alert("Error al crear partida en la nube: " + e.message);
            }
        }
    };

    const handleJoinGame = async (gameId, hostPeerId, gameSettings) => {
        // Delete the game immediately when accepted
        try {
            await deleteDoc(doc(db, "games", gameId));
        } catch (e) {
            console.error("Error deleting game:", e);
        }

        // Reconstruct settings from game data
        const settings = {
            gameMode: 'p2p',
            color: gameSettings.color === 'white' ? 'black' : 'white', // Opposite color
            timeControl: gameSettings.timeControl,
            elo: 1200
        };

        onConnect(hostPeerId, settings);
    };

    // Helper function to convert country code to flag emoji
    const getCountryFlag = (countryCode) => {
        if (!countryCode) return '🌍'; // Fallback: globe

        try {
            const codePoints = countryCode
                .toUpperCase()
                .split('')
                .map(char => 127397 + char.charCodeAt());
            return String.fromCodePoint(...codePoints);
        } catch (e) {
            return '🌍';
        }
    };

    // Send chat message
    const handleSendMessage = async () => {
        if (!chatInput.trim() || !myId || !playerName) return;

        // Limit message length
        const message = chatInput.trim().substring(0, 200);

        try {
            await addDoc(collection(db, 'globalChat'), {
                userId: myId,
                name: playerName,
                country: userCountry,
                message: message,
                timestamp: Date.now()
            });

            setChatInput(''); // Clear input after sending
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const cancelHosting = async () => {
        if (hostedGameId) {
            try {
                await deleteDoc(doc(db, "games", hostedGameId));
            } catch (e) { console.error(e); }
            setHostedGameId(null);
        }
        setIsHosting(false);
    };

    // Cleanup on unmount if hosting
    useEffect(() => {
        return () => {
            if (isHosting && hostedGameId) {
                deleteDoc(doc(db, "games", hostedGameId)).catch(e => console.error(e));
            }
        };
    }, [isHosting, hostedGameId]);

    // Debug Log Ref
    const logRef = React.useRef(null);

    return (
        <div className="lobby-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1>Ajedrez P2P</h1>
                {/* Menú desplegable estilo Android */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '50%',
                            transition: 'background 0.2s',
                            color: 'white'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        title="Menú"
                    >
                        ⋮
                    </button>

                    {showMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            background: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            minWidth: '180px',
                            zIndex: 1000,
                            marginTop: '0.5rem'
                        }}>
                            <button
                                onClick={() => {
                                    setShowSettings(true);
                                    setShowMenu(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    fontSize: '0.95rem',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontSize: '1.2rem' }}>⚙️</span>
                                Configuración
                            </button>
                            <button
                                onClick={() => {
                                    setShowDonate(true);
                                    setShowMenu(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    fontSize: '0.95rem',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontSize: '1.2rem' }}>❤️</span>
                                Donar
                            </button>
                            <button
                                onClick={() => {
                                    setShowAbout(true);
                                    setShowMenu(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    fontSize: '0.95rem',
                                    borderRadius: '0 0 8px 8px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                                Acerca de
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="card" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                {/* COLUMNA IZQUIERDA: Configuración */}
                <div className="lobby-left-column">
                    {/* User Info */}
                    {user ? (
                        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem' }}>Usuario</label>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                position: 'relative'
                            }}>
                                <div
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.5rem',
                                        background: showUserMenu ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => !showUserMenu && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)')}
                                    onMouseOut={(e) => !showUserMenu && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                                >
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName}
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%'
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                                            {user.displayName}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--secondary-color)', opacity: 0.7 }}>
                                            {user.email}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                                        {showUserMenu ? '▲' : '▼'}
                                    </div>
                                </div>

                                {showUserMenu && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowUserMenu(false);
                                                setShowSettings(true);
                                            }}
                                            style={{
                                                padding: '0.5rem',
                                                fontSize: '0.85rem',
                                                textAlign: 'left',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#e2e8f0',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                width: '100%',
                                                borderRadius: '4px'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            ⚙️ Configuración
                                        </button>
                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.2rem 0' }}></div>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    await signOut(auth);
                                                    setShowUserMenu(false);
                                                } catch (error) {
                                                    console.error('Error signing out:', error);
                                                    alert('Error al cerrar sesión: ' + error.message);
                                                }
                                            }}
                                            style={{
                                                padding: '0.5rem',
                                                fontSize: '0.75rem',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                color: '#ef4444',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                width: '100%'
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
                                            🚪 Cerrar sesión
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem' }}>Tu Nombre</label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                                maxLength={15}
                                style={{ padding: '0.4rem' }}
                            />
                        </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem' }}>Modo de Juego</label>
                        <div className="mode-selector">
                            <button
                                className={gameMode === 'p2p' ? 'active' : ''}
                                onClick={() => setGameMode('p2p')}
                                style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                            >
                                Online (P2P)
                            </button>
                            <button
                                className={gameMode === 'computer' ? 'active' : ''}
                                onClick={() => setGameMode('computer')}
                                style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                            >
                                Contra Stockfish
                            </button>
                            <button
                                className={gameMode === 'lichess' ? 'active' : ''}
                                onClick={() => setGameMode('lichess')}
                                style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                            >
                                Lichess.org
                            </button>
                        </div>
                    </div>

                    {!isHosting && (
                        <>
                            <div className="form-group">
                                <label>Tu Color</label>
                                <div className="color-selector">
                                    <button className={color === 'white' ? 'active' : ''} onClick={() => setColor('white')}>Blancas</button>
                                    <button className={color === 'random' ? 'active' : ''} onClick={() => setColor('random')}>Aleatorio</button>
                                    <button className={color === 'black' ? 'active' : ''} onClick={() => setColor('black')}>Negras</button>
                                </div>
                            </div>

                            {gameMode === 'computer' && (
                                <div className="form-group">
                                    <label>Nivel (ELO)</label>
                                    <select value={elo} onChange={(e) => setElo(e.target.value)}>
                                        <option value="800">Principiante (800)</option>
                                        <option value="1200">Aficionado (1200)</option>
                                        <option value="1600">Intermedio (1600)</option>
                                        <option value="2000">Avanzado (2000)</option>
                                        <option value="2500">Maestro (2500)</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Tiempo</label>
                                <select value={timeControl} onChange={(e) => setTimeControl(e.target.value)}>
                                    <option value="1+0">Bullet (1+0)</option>
                                    <option value="2+1">Bullet (2+1)</option>
                                    <option value="3+0">Blitz (3+0)</option>
                                    <option value="3+2">Blitz (3+2)</option>
                                    <option value="5+0">Blitz (5+0)</option>
                                    <option value="5+3">Blitz (5+3)</option>
                                    <option value="10+0">Rápida (10+0)</option>
                                    <option value="10+5">Rápida (10+5)</option>
                                    <option value="15+10">Rápida (15+10)</option>
                                    <option value="30+0">Clásica (30+0)</option>
                                    <option value="30+20">Clásica (30+20)</option>
                                </select>

                                {timeControl === 'custom' && (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.65rem' }}>Minutos</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="180"
                                                value={customTime}
                                                onChange={(e) => setCustomTime(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                                                style={{ width: '100%', padding: '0.4rem' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.65rem' }}>Incremento (seg)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={customInc}
                                                onChange={(e) => setCustomInc(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
                                                style={{ width: '100%', padding: '0.4rem' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {gameMode === 'lichess' && !lichessToken ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                                        <strong>Configuración Inicial:</strong><br />
                                        Lichess requiere un token personal para jugar desde apps externas.
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Pega tu token aquí (lip_...)"
                                        id="lichess-token-input"
                                        style={{
                                            padding: '0.8rem',
                                            background: '#0f172a',
                                            border: '1px solid #334155',
                                            color: 'white',
                                            borderRadius: '6px',
                                            fontSize: '0.9rem'
                                        }}
                                    />

                                    <button
                                        className="btn-primary"
                                        onClick={() => {
                                            const token = document.getElementById('lichess-token-input').value.trim();
                                            if (token) {
                                                localStorage.setItem('lichess_token', token);
                                                window.location.reload();
                                            } else {
                                                alert("Por favor, pega el token primero.");
                                            }
                                        }}
                                    >
                                        Guardar y Conectar
                                    </button>

                                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.8rem', borderRadius: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                        <strong>¿Cómo obtener el token?</strong>
                                        <ol style={{ margin: '0.5rem 0 0 1.2rem', padding: 0 }}>
                                            <li>Ve a <a href="https://lichess.org/account/oauth/token/create" target="_blank" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Lichess Tokens</a></li>
                                            <li>Activa todos los permisos de <strong>"Board" (Tablero)</strong>.</li>
                                            <li>Dale al botón azul "Submit".</li>
                                            <li>Copia el código y pégalo arriba.</li>
                                        </ol>
                                        <div style={{ marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.8 }}>
                                            *Solo necesitas hacer esto una vez.
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Lichess Tabs */}
                            {gameMode === 'lichess' && lichessToken && (
                                <div style={{ marginTop: '1rem' }}>
                                    {/* Tab Navigation */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        marginBottom: '1rem',
                                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                                        paddingBottom: '0.5rem'
                                    }}>
                                        <button
                                            onClick={() => setLichessTab('create')}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: lichessTab === 'create' ? '#3b82f6' : 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            Crear Partida
                                        </button>
                                        <button
                                            onClick={() => setLichessTab('challenges')}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: lichessTab === 'challenges' ? '#3b82f6' : 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            Retos
                                        </button>
                                        <button
                                            onClick={() => setLichessTab('spectate')}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: lichessTab === 'spectate' ? '#3b82f6' : 'transparent',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            Observar
                                        </button>
                                    </div>

                                    {/* Tab Content */}
                                    {lichessTab === 'create' && (
                                        <div>
                                            <button
                                                className="btn-primary"
                                                onClick={() => {
                                                    if (isSearchingLichess) {
                                                        setIsSearchingLichess(false);
                                                        window.location.reload(); // Reload to cancel stream
                                                    } else {
                                                        handleCreateGame();
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    marginBottom: '0.75rem',
                                                    background: isSearchingLichess ? '#ef4444' : undefined
                                                }}
                                            >
                                                {isSearchingLichess ? 'Cancelar Búsqueda' : 'Emparejar Partida'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('¿Quieres cambiar tu token de Lichess?')) {
                                                        localStorage.removeItem('lichess_token');
                                                        window.location.reload();
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    background: 'transparent',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    borderRadius: '6px',
                                                    color: '#94a3b8',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Cambiar Token
                                            </button>
                                        </div>
                                    )}
                                    {lichessTab === 'challenges' && (
                                        <LichessChallenges
                                            onAccept={(gameId) => {
                                                onConnect('lichess:' + gameId, settings);
                                            }}
                                        />
                                    )}
                                    {lichessTab === 'spectate' && (
                                        <LichessSpectate
                                            onWatch={(gameId) => {
                                                onConnect('lichess:' + gameId, { ...settings, spectator: true });
                                            }}
                                        />
                                    )}
                                </div>
                            )}

                            {gameMode !== 'lichess' && (
                                <button
                                    className="btn-primary"
                                    onClick={handleCreateGame}
                                    disabled={(gameMode === 'p2p' && !myId) || (gameMode === 'lichess' && isSearchingLichess)}
                                >
                                    {gameMode === 'computer' ? 'Jugar contra Stockfish' :
                                        gameMode === 'lichess' ? (isSearchingLichess ? 'Buscando Oponente...' : 'Buscar en Lichess (10+0)') :
                                            'Crear Partida Pública'}
                                </button>
                            )}
                        </>
                    )}

                    {isHosting && (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <div className="spinner" style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                            <h3>Esperando oponente...</h3>
                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Tu partida es visible mundialmente.</p>
                            <button className="btn-secondary" onClick={cancelHosting} style={{ marginTop: '1rem' }}>
                                Cancelar
                            </button>
                        </div>
                    )}

                    {/* Mensaje de confirmación al publicar reto */}
                    {publishMessage && (
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.5)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1rem',
                            textAlign: 'center',
                            color: '#22c55e',
                            fontWeight: '500',
                            animation: 'slideIn 0.3s ease-out'
                        }}>
                            {publishMessage}
                        </div>
                    )}
                </div>

                {/* COLUMNA DERECHA: Lista de Partidas */}
                <div className="lobby-right-column">
                    {gameMode === 'p2p' && !isHosting && (
                        <div className="game-list-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0 }}>Partidas disponibles</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        style={{
                                            padding: '0.25rem 0.4rem',
                                            fontSize: '0.7rem',
                                            background: '#1e293b',
                                            color: '#f1f5f9',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <option value="recent">Más reciente</option>
                                        <option value="time-asc">Tiempo menor</option>
                                        <option value="time-desc">Tiempo mayor</option>
                                    </select>
                                    <button
                                        className="btn-secondary"
                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                        onClick={() => window.location.reload()}
                                    >
                                        🔄
                                    </button>
                                </div>
                            </div>
                            <div className="game-list">
                                {games.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '1rem', fontSize: '0.9rem' }}>
                                        No hay partidas. ¡Sé el primero!
                                    </div>
                                ) : (
                                    games.map(g => (
                                        <div key={g.id} style={{
                                            background: '#334155',
                                            padding: '0.8rem',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                {/* Bandera + Nombre */}
                                                <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.95rem' }}>
                                                    {getCountryFlag(g.country)} {g.hostName || g.name}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                    {g.timeControl} • {g.color === 'white' ? 'Juega Blancas' : 'Juega Negras'}
                                                </div>
                                            </div>
                                            <button
                                                className="btn-secondary"
                                                onClick={() => handleJoinGame(g.id, g.hostId, g)}
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                            >
                                                Jugar
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CONNECTION STATUS INDICATOR */}
            <div
                data-connection-indicator
                style={{
                    marginTop: '1rem',
                    maxWidth: '900px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    position: 'relative'
                }}>
                <div
                    onClick={() => setShowStatusTooltip(!showStatusTooltip)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '12px',
                        background: showStatusTooltip ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                        transition: 'background 0.2s'
                    }}
                >
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: connectionStatus === 'offline' ? '#ef4444' : (connectionStatus === 'slow' ? '#eab308' : '#22c55e'),
                        boxShadow: connectionStatus === 'offline' ? '0 0 8px #ef4444' : (connectionStatus === 'slow' ? '0 0 8px #eab308' : '0 0 8px #22c55e'),
                        animation: 'pulse 2s infinite'
                    }}></div>
                    <span style={{
                        fontSize: '0.7rem',
                        color: connectionStatus === 'offline' ? '#ef4444' : (connectionStatus === 'slow' ? '#eab308' : '#22c55e'),
                        fontWeight: '500',
                        opacity: 0.8
                    }}>
                        {connectionStatus === 'offline' ? 'Sin conexión' : (connectionStatus === 'slow' ? 'Conexión lenta' : 'Conectado')}
                    </span>
                </div>

                {/* Tooltip */}
                {showStatusTooltip && (
                    <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '0.5rem',
                        background: 'rgba(0, 0, 0, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        fontSize: '0.75rem',
                        maxWidth: '280px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        zIndex: 1000,
                        animation: 'slideUp 0.2s ease-out'
                    }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'white' }}>
                            Estado de Conexión
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                                <span style={{ color: '#94a3b8' }}>Verde: Conexión estable y óptima</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }}></div>
                                <span style={{ color: '#94a3b8' }}>Amarillo: Conexión lenta o inestable</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                                <span style={{ color: '#94a3b8' }}>Rojo: Sin conexión a internet</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* GLOBAL CHAT */}
            {showChat && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '320px',
                    maxHeight: '450px',
                    background: 'var(--surface-color)',
                    borderRadius: '12px',
                    boxShadow: 'var(--elevation-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 100,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderTopLeftRadius: '12px',
                        borderTopRightRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>💬</span>
                            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Chat Global</span>
                            <span style={{
                                fontSize: '0.7rem',
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#60a5fa',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '10px',
                                fontWeight: '600'
                            }}>
                                {onlineUsers} online
                            </span>
                        </div>
                        <button onClick={() => setShowChat(false)} style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '0',
                            lineHeight: 1
                        }}>×</button>
                    </div>
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        minHeight: '250px',
                        maxHeight: '320px'
                    }}>
                        {chatMessages.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '2rem 1rem' }}>
                                No hay mensajes aún. ¡Sé el primero en escribir!
                            </div>
                        ) : (
                            chatMessages.map((msg) => (
                                <div key={msg.id} style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    fontSize: '0.8rem',
                                    padding: '0.4rem',
                                    borderRadius: '6px',
                                    background: msg.userId === myId ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                                }}>
                                    <span style={{ fontSize: '1rem' }}>{getCountryFlag(msg.country)}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: '600',
                                            color: msg.userId === myId ? '#60a5fa' : '#94a3b8',
                                            marginBottom: '0.15rem'
                                        }}>{msg.name}</div>
                                        <div style={{ color: '#e2e8f0', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                            {msg.message}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div style={{
                        padding: '0.75rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        gap: '0.5rem'
                    }}>
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Escribe un mensaje..."
                            maxLength={200}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                background: '#0f172a',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '0.85rem'
                            }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim()}
                            style={{
                                padding: '0.5rem 1rem',
                                background: chatInput.trim() ? 'var(--primary-color)' : '#334155',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                                fontSize: '0.85rem',
                                fontWeight: '600'
                            }}
                        >Enviar</button>
                    </div>
                </div>
            )}

            {!showChat && (
                <button onClick={() => setShowChat(true)} style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--primary-color)',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    boxShadow: 'var(--elevation-4)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    💬
                    {onlineUsers > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '0.7rem',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600'
                        }}>{onlineUsers}</span>
                    )}
                </button>
            )}

            {/* Settings Modal */}
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}

            {/* Modal Acerca de */}
            {showAbout && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: '#1e293b',
                        padding: '2rem',
                        borderRadius: '12px',
                        maxWidth: '500px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h2 style={{ marginBottom: '1rem' }}>ℹ️ Acerca de Ajedrez P2P</h2>
                        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1rem' }}>
                            <strong>Versión:</strong> 1.0.0
                        </p>
                        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1rem' }}>
                            Ajedrez P2P es una plataforma de ajedrez online que utiliza conexiones peer-to-peer
                            para ofrecer partidas rápidas y sin lag con tus amigos.
                        </p>
                        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1rem' }}>
                            <strong>Características:</strong>
                        </p>
                        <ul style={{ color: '#94a3b8', lineHeight: '1.8', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                            <li>Conexión P2P directa sin servidores centrales</li>
                            <li>Stockfish integrado para jugar contra IA</li>
                            <li>Integración con Lichess.org</li>
                            <li>Video chat y mensajes de voz</li>
                            <li>Código abierto en GitHub</li>
                        </ul>
                        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                            <strong>Repositorio:</strong> <a href="https://github.com/Taladro678/ajedrez-p2p" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>github.com/Taladro678/ajedrez-p2p</a>
                        </p>
                        <button
                            onClick={() => setShowAbout(false)}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Donar */}
            {showDonate && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: '#1e293b',
                        padding: '2rem',
                        borderRadius: '12px',
                        maxWidth: '500px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ marginBottom: '1rem' }}>❤️ Apoya el Proyecto</h2>
                        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                            Si te gusta Ajedrez P2P y quieres apoyar su desarrollo,
                            puedes hacer una donación para ayudar a mantener el proyecto.
                        </p>
                        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                            <strong>Opciones de donación:</strong>
                        </p>
                        <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                            {/* Bitcoin */}
                            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <strong>Bitcoin (BTC):</strong>
                                </p>
                                <a
                                    href="bitcoin:bc1plq8sspj4k0kn530geeh34ewxq9dk4df5ymunuxucwgh5sr8h2hcsf4c0hz"
                                    style={{
                                        color: '#3b82f6',
                                        fontSize: '0.75rem',
                                        wordBreak: 'break-all',
                                        textDecoration: 'none',
                                        display: 'block',
                                        cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                        navigator.clipboard.writeText('bc1plq8sspj4k0kn530geeh34ewxq9dk4df5ymunuxucwgh5sr8h2hcsf4c0hz');
                                    }}
                                >
                                    bc1plq8sspj4k0kn530geeh34ewxq9dk4df5ymunuxucwgh5sr8h2hcsf4c0hz
                                </a>
                            </div>

                            {/* Lightning */}
                            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <strong>Lightning ⚡:</strong>
                                </p>
                                <a
                                    href="lightning:lno1pgqppmsrse80qf0aara4slvcjxrvu6j2rp5ftmjy4yntlsmsutpkvkt6878s932cl82yjt2wy4uf0r3lmsqtn9v9qgkvdw3hw8hn6ds7e62nztf0qgpl6rmgd6uy7yghpexn8m5zzn5v8drcmuhl7pzxq4wget2h70ezp0sqxwe8r9gxaw482qhue30xctgxawxxq9l8wyjaas6v8d6gfskjh582nqhtgg875ms9pr4k2ewhmh37vtuwg99qyccdtmedh8ulmmmzkmacjgnhsr8m4uea79sq8wttnl33nevxzwwhqqeflsln4vlqqjed0hypkjt980e3vrk698js7vf8jkmsrz2zdyd5q4cf6urcmvjgyw22cn72rxse8unxw46q"
                                    style={{
                                        color: '#3b82f6',
                                        fontSize: '0.85rem',
                                        textDecoration: 'none',
                                        display: 'block',
                                        cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                        navigator.clipboard.writeText('lno1pgqppmsrse80qf0aara4slvcjxrvu6j2rp5ftmjy4yntlsmsutpkvkt6878s932cl82yjt2wy4uf0r3lmsqtn9v9qgkvdw3hw8hn6ds7e62nztf0qgpl6rmgd6uy7yghpexn8m5zzn5v8drcmuhl7pzxq4wget2h70ezp0sqxwe8r9gxaw482qhue30xctgxawxxq9l8wyjaas6v8d6gfskjh582nqhtgg875ms9pr4k2ewhmh37vtuwg99qyccdtmedh8ulmmmzkmacjgnhsr8m4uea79sq8wttnl33nevxzwwhqqeflsln4vlqqjed0hypkjt980e3vrk698js7vf8jkmsrz2zdyd5q4cf6urcmvjgyw22cn72rxse8unxw46q');
                                    }}
                                >
                                    Click para abrir en billetera Lightning
                                </a>
                            </div>

                            {/* PayPal */}
                            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <strong>PayPal:</strong>
                                </p>
                                <a
                                    href="https://paypal.me/luvinRafael"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: '#3b82f6',
                                        fontSize: '0.9rem',
                                        textDecoration: 'none'
                                    }}
                                >
                                    luvinRafael@gmail.com
                                </a>
                            </div>

                            {/* Binance */}
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <strong>Binance:</strong>
                                </p>
                                <p style={{ color: '#3b82f6', fontSize: '0.9rem', margin: 0 }}>
                                    luvinrafael@gmail.com
                                </p>
                            </div>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            ¡Gracias por tu apoyo! 🙏
                        </p>
                        <button
                            onClick={() => setShowDonate(false)}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lobby;
