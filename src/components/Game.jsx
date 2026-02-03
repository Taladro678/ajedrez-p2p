import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { useVideoChat } from '../hooks/useVideoChat';
import { useVoiceMessage } from '../hooks/useVoiceMessage';
import VideoChat from './VideoChat';
import { googleDriveService } from '../services/googleDrive';
import { soundManager } from '../utils/soundManager';
import { useSettings } from '../contexts/SettingsContext';

// --- IMÁGENES DE PIEZAS ---
const PIECE_IMAGES = {
    'w': {
        'p': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
        'r': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
        'n': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
        'b': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
        'q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
        'k': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    },
    'b': {
        'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
        'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
        'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
        'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
        'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
        'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    }
};

const Game = ({ onDisconnect, connection, settings, hostedGameId, peer }) => {
    const [game, setGame] = useState(() => {
        const newGame = new Chess();
        if (settings?.pgn) {
            try {
                newGame.loadPgn(settings.pgn);
            } catch (e) {
                console.error('Error loading PGN:', e);
            }
        }
        return newGame;
    });
    const [orientation, setOrientation] = useState('white');
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [lastMove, setLastMove] = useState(null); // { from: 'e2', to: 'e4' }
    const [draggedPiece, setDraggedPiece] = useState(null);
    const [internalSettings, setInternalSettings] = useState(settings || null);

    // Chat & UI State
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [whiteTime, setWhiteTime] = useState(null);
    const [blackTime, setBlackTime] = useState(null);
    const [winner, setWinner] = useState(null);

    // Responsive Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    // Initialize timers when settings are available
    useEffect(() => {
        if (!internalSettings) return;
        const timePart = internalSettings.timeControl?.split('+')[0] || "10";
        const initialSeconds = parseInt(timePart) * 60;
        setWhiteTime(initialSeconds);
        setBlackTime(initialSeconds);
        setOrientation(internalSettings.color || 'white');
    }, [internalSettings]);

    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, incoming, connected
    const [incomingCallType, setIncomingCallType] = useState(null); // audio, video
    const [myCallType, setMyCallType] = useState(null); // what I requested
    const [lastToast, setLastToast] = useState(null);
    const [drawOffer, setDrawOffer] = useState(false); // If opponent offered draw
    const [isVideoChatMinimized, setIsVideoChatMinimized] = useState(false);

    // Video Chat Hook
    const {
        localStream,
        remoteStream,
        isVideoEnabled,
        isAudioEnabled,
        toggleVideo,
        toggleAudio,
        cleanup: cleanupVideo
    } = useVideoChat(connection, callStatus === 'connected');

    const handleToggleVideo = () => toggleVideo();
    const handleToggleAudio = () => toggleAudio();
    const endCall = () => {
        setCallStatus('idle');
        cleanupVideo();
        if (connection) connection.send({ type: 'call-ended' });
    };

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(settings?.isAnalysis || false);
    const [analysisResults, setAnalysisResults] = useState([]);
    const [currentAnalysisMove, setCurrentAnalysisMove] = useState(0);

    // Refs
    const engine = useRef(null);   // For playing against computer
    const analyst = useRef(null);  // For analysis (anti-cheat & helper)
    const messagesEndRef = useRef(null);

    // Voice Message Hook
    const {
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        cancelRecording
    } = useVoiceMessage();

    const handleVoiceMessage = async () => {
        const blob = await stopRecording();
        if (blob && connection) {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64Audio = reader.result;
                // Send audio message
                const msg = { sender: 'Tú', type: 'voice', audio: base64Audio, duration: recordingTime };
                setMessages(prev => [...prev, msg]);
                connection.send({ type: 'chat', message: '🎤 Mensaje de voz', audio: base64Audio, duration: recordingTime, isVoice: true });
            };
        }
    };


    // --- ANTI-CHEAT: FOCUS DETECTION ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // User went to background
                if (connection && !game.isGameOver() && !winner) {
                    connection.send({ type: 'focus-lost' });
                }
            } else {
                // User came back
                if (connection && !game.isGameOver() && !winner) {
                    connection.send({ type: 'focus-gained' });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [connection, game, winner]);


    // --- STOCKFISH INITIALIZATION ---
    useEffect(() => {
        // 1. Initialize Game Engine (Only for Computer Mode)
        if (internalSettings?.gameMode === 'computer') {
            const worker = new Worker('/stockfish.js');
            engine.current = worker;
            worker.onmessage = (e) => {
                const message = e.data;
                if (message.startsWith('bestmove')) {
                    const move = message.split(' ')[1];
                    safeMakeMove(move);
                }
            };
            worker.postMessage('uci');
            worker.postMessage('isready');
        }

        // 2. Initialize Analyst (For everyone)
        const analystWorker = new Worker('/stockfish.js');
        analyst.current = analystWorker;

        // Analyst doesn't make moves, it just stores scores
        // We handle specific messages in analyzePosition via explicit listeners or here
        // But since analyzePosition attaches 'once' listeners, we can leave this generic or empty
        analystWorker.postMessage('uci');
        analystWorker.postMessage('isready');
        console.log('Stockfish workers loaded');

        return () => {
            if (engine.current) engine.current.terminate();
            if (analyst.current) analyst.current.terminate();
        };
    }, [internalSettings?.gameMode]); // Re-init if mode changes

    // --- COMPUTER MOVE TRIGGER ---
    useEffect(() => {
        if (internalSettings?.gameMode === 'computer' && !game.isGameOver() && !winner && engine.current) {
            const isComputerTurn = (internalSettings.color === 'white' && game.turn() === 'b') ||
                (internalSettings.color === 'black' && game.turn() === 'w');

            if (isComputerTurn) {
                // Add a small random delay for realism
                setTimeout(() => {
                    const elo = internalSettings.elo || 1200;
                    let depth = 5;
                    // Simple difficulty mapping
                    if (elo >= 2000) depth = 15;
                    else if (elo >= 1500) depth = 10;
                    else depth = 5;

                    const skill = Math.min(20, Math.max(0, Math.floor((elo - 800) / (1700 / 20))));
                    engine.current.postMessage(`setoption name Skill Level value ${skill}`);
                    engine.current.postMessage(`position fen ${game.fen()}`);
                    engine.current.postMessage(`go depth ${depth}`);
                }, 500);
            }
        }
    }, [game, internalSettings, winner]);

    // Analyze position using secondary worker
    const analyzePosition = (fen, moveNumber) => {
        if (!analyst.current) return;

        analyst.current.postMessage(`position fen ${fen}`);
        analyst.current.postMessage('go depth 15');

        const handleMessage = (e) => {
            const line = e.data;
            if (line.includes('score cp')) {
                const match = line.match(/score cp (-?\d+)/);
                if (match) {
                    const score = parseInt(match[1]) / 100;
                    setAnalysisResults(prev => {
                        const newResults = [...prev];
                        // If it's black's turn to move in the analysis, score is relative to black.
                        // We usually want white-relative score for graphs, or relative to current player.
                        // Stockfish gives score relative to side to move.
                        // Let's store it as is and adjust in UI if needed, or normalized here.
                        newResults[moveNumber] = { fen, score, moveNumber };
                        return newResults;
                    });
                }
            }
        };

        analyst.current.addEventListener('message', handleMessage, { once: true });
    };

    // Classify move quality
    const classifyMove = (scoreBefore, scoreAfter) => {
        // Simple classifier logic
        if (scoreBefore === undefined || scoreAfter === undefined) return { type: 'ok', color: '#94a3b8' };

        // Invert score if it was black's turn? 
        // For simplicity, let's assume we compare absolute changes or relative.
        // This logic needs to be robust but for now let's keep it simple to fix errors first.
        const diff = scoreAfter - scoreBefore;

        if (Math.abs(diff) < 0.5) return { type: 'ok', label: '', color: '#94a3b8' };
        if (diff > 1.0) return { type: 'good', label: '!', color: '#22c55e' };
        if (diff < -2.0) return { type: 'blunder', label: '??', color: '#dc2626' };
        if (diff < -1.0) return { type: 'mistake', label: '?', color: '#ef4444' };
        return { type: 'ok', label: '', color: '#94a3b8' };
    };

    // Detect engine usage
    const detectEngineUsage = () => {
        if (analysisResults.length < 10) return null;
        let suspiciousMoves = 0;
        // Mock analysis logic for display
        return {
            accuracy: "Calculando...",
            suspicious: false
        };
    };

    // Make move with analysis

    // Make move with analysis

    // --- TIMER LOGIC ---
    useEffect(() => {
        if (game.isGameOver() || winner || whiteTime === null || blackTime === null) return;
        if (internalSettings?.gameMode === 'p2p' && !connection) return;

        const timer = setInterval(() => {
            let newWhiteTime = whiteTime;
            let newBlackTime = blackTime;

            if (game.turn() === 'w') {
                newWhiteTime = Math.max(0, whiteTime - 1);
                setWhiteTime(newWhiteTime);
            } else {
                newBlackTime = Math.max(0, blackTime - 1);
                setBlackTime(newBlackTime);
            }

            // Sound alerts for low time (only for current player)
            const myColor = internalSettings?.color;
            const myTime = myColor === 'white' ? newWhiteTime : newBlackTime;
            const isMyTurn = (game.turn() === 'w' && myColor === 'white') || (game.turn() === 'b' && myColor === 'black');

            if (isMyTurn && (myTime === 20 || myTime === 10)) {
                soundManager.playNotify();
            }

        }, 1000);

        return () => clearInterval(timer);
    }, [game, winner, whiteTime, blackTime, connection, internalSettings]);

    // --- TIMEOUT CHECK ---
    useEffect(() => {
        if (whiteTime === 0 && !winner) {
            setWinner('Negras (Tiempo)');
            if (internalSettings?.color === 'black') playSound('win');
            else playSound('lose');
        }
        if (blackTime === 0 && !winner) {
            setWinner('Blancas (Tiempo)');
            if (internalSettings?.color === 'white') playSound('win');
            else playSound('lose');
        }
    }, [whiteTime, blackTime, winner, internalSettings]);

    // --- SAVE GAME HISTORY ---
    useEffect(() => {
        if (winner) {
            const saveGame = async () => {
                try {
                    const history = JSON.parse(localStorage.getItem('chess_p2p_history') || '[]');
                    const gameData = {
                        id: Date.now(),
                        date: new Date().toISOString(),
                        pgn: game.pgn(),
                        white: internalSettings?.color === 'white' ? 'Tú' : 'Oponente',
                        black: internalSettings?.color === 'black' ? 'Tú' : 'Oponente',
                        result: winner,
                        mode: internalSettings?.gameMode || 'p2p'
                    };
                    history.unshift(gameData);
                    localStorage.setItem('chess_p2p_history', JSON.stringify(history));
                    console.log('Partida guardada en historial', gameData);

                    // Auto-sync with Google Drive if available
                    if (sessionStorage.getItem('google_access_token')) {
                        try {
                            const savedSettings = JSON.parse(localStorage.getItem('chess_settings') || '{}');
                            await googleDriveService.syncAppData(history, savedSettings);
                            console.log('✅ Sincronizado con Google Drive');
                        } catch (syncError) {
                            console.error('Error in auto-sync:', syncError);
                        }
                    }
                } catch (e) {
                    console.error('Error saving game history:', e);
                }
            };
            saveGame();
        }
    }, [winner]); // Run once when winner is set


    // --- P2P LOGIC ---
    useEffect(() => {
        if (!connection) return;

        if (settings) {
            const sendSettings = () => connection.send({ type: 'settings', settings });
            if (connection.open) sendSettings();
            connection.on('open', sendSettings);
        }

        const handleData = (data) => {
            if (data.type === 'move') {
                safeMakeMove(data.move);
            } else if (data.type === 'settings') {
                const receivedSettings = data.settings;
                const mySettings = {
                    ...receivedSettings,
                    color: receivedSettings.color === 'white' ? 'black' : 'white'
                };
                setInternalSettings(mySettings);
            } else if (data.type === 'chat') {
                setMessages(prev => [...prev, { sender: 'Oponente', text: data.message }]);
                playSound('notify');
                if (!isChatOpen) {
                    setUnreadCount(prev => prev + 1);
                    setLastToast({ sender: 'Oponente', text: data.message, id: Date.now() });
                    setTimeout(() => setLastToast(null), 3000);
                }
            } else if (data.type === 'chat') {
                setMessages(prev => [...prev, { sender: 'Oponente', text: data.message }]);
                playSound('notify');
                if (!isChatOpen) {
                    setUnreadCount(prev => prev + 1);
                    setLastToast({ sender: 'Oponente', text: data.message, id: Date.now() });
                    setTimeout(() => setLastToast(null), 3000);
                }
            } else if (data.type === 'resign') {
                setWinner('Tú (Rendición)');
                playSound('win');
            } else if (data.type === 'offer-draw') {
                setDrawOffer(true);
                playSound('notify');
                setLastToast({ sender: 'Sistema', text: 'Oponente ofrece tablas', id: Date.now() });
            } else if (data.type === 'draw-accepted') {
                setWinner('Tablas (Acuerdo)');
                playSound('draw');
                setLastToast({ sender: 'Sistema', text: 'Tablas aceptadas', id: Date.now() });
            } else if (data.type === 'draw-declined') {
                setLastToast({ sender: 'Sistema', text: 'Tablas rechazadas', id: Date.now() });
            } else if (data.type === 'call-request') {
                if (callStatus === 'idle') {
                    setIncomingCallType(data.callType);
                    setCallStatus('incoming');
                    playSound('notify');
                } else {
                    // Busy
                    if (connection) connection.send({ type: 'call-busy' });
                }
            } else if (data.type === 'call-accepted') {
                setCallStatus('connected');
                setLastToast({ sender: 'Sistema', text: 'Llamada conectada', id: Date.now() });
                // If audio only was requested, toggle video off immediately (hacky but works for now)
                if (myCallType === 'audio' && isVideoEnabled) {
                    // We need to wait for stream so we do it in useEffect or let user do it.
                    // For now user starts with video enabled usually.
                }
            } else if (data.type === 'call-rejected') {
                setCallStatus('idle');
                setLastToast({ sender: 'Sistema', text: 'Llamada rechazada', id: Date.now() });
            } else if (data.type === 'call-ended') {
                setCallStatus('idle');
                cleanupVideo();
                setLastToast({ sender: 'Sistema', text: 'Llamada finalizada', id: Date.now() });
            } else if (data.type === 'focus-lost') {
                setLastToast({
                    sender: 'Seguridad',
                    text: '⚠️ Oponente minimizó el juego',
                    id: Date.now(),
                    style: { background: '#f59e0b', color: 'black' }
                });
                playSound('notify');
            } else if (data.type === 'focus-gained') {
                setLastToast({
                    sender: 'Seguridad',
                    text: 'Oponente regresó',
                    id: Date.now()
                });
            }
        };

        connection.on('data', handleData);
        return () => connection.off('data', handleData);
    }, [connection, settings]);

    // --- CHAT SCROLL ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Check for game over conditions - runs AFTER game state updates
    useEffect(() => {
        if (!game || winner) return;

        console.log('=== Checking Game State ===');
        console.log('isGameOver:', game.isGameOver());
        console.log('isCheckmate:', game.isCheckmate());
        console.log('isCheck:', game.isCheck());
        console.log('isStalemate:', game.isStalemate());
        console.log('Turn:', game.turn());

        if (game.isGameOver()) {
            let resultMessage = '';

            if (game.isCheckmate()) {
                // The current turn is the LOSER (they have no moves)
                const winnerColor = game.turn() === 'w' ? 'Negras' : 'Blancas';
                resultMessage = `Jaque Mate - Ganan ${winnerColor}`;
                console.log('✓ CHECKMATE DETECTED!', resultMessage);

                const myColor = internalSettings?.color || 'white';
                const loserColor = game.turn() === 'w' ? 'white' : 'black';
                if (myColor === loserColor) {
                    playSound('lose');
                } else {
                    playSound('win');
                }
            } else if (game.isStalemate()) {
                resultMessage = 'Tablas por Ahogado (Stalemate)';
                console.log('✓ STALEMATE!');
                playSound('draw');
            } else if (game.isThreefoldRepetition()) {
                resultMessage = 'Tablas por Repetición';
                playSound('draw');
            } else if (game.isInsufficientMaterial()) {
                resultMessage = 'Tablas por Material Insuficiente';
                playSound('draw');
            } else if (game.isDraw()) {
                resultMessage = 'Tablas';
                playSound('draw');
            }

            if (resultMessage) {
                console.log('→ Setting winner:', resultMessage);
                setWinner(resultMessage);
            }
        }
    }, [game, winner, internalSettings]);

    // --- HELPERS ---

    function safeMakeMove(moveOrSan) {
        setGame(g => {
            const copy = new Chess(g.fen());
            try {
                const result = copy.move(moveOrSan);
                if (result) {
                    // Guardar último movimiento para resaltado
                    setLastMove({ from: result.from, to: result.to });

                    if (result.captured) playSound('capture');
                    else playSound('move');

                    // Game over will be checked by useEffect

                    // Analyze position in background
                    if (engine.current) {
                        const moveNumber = copy.history().length;
                        setTimeout(() => analyzePosition(copy.fen(), moveNumber), 100);
                    }

                    return copy;
                }
            } catch (e) {
                console.error('Error in safeMakeMove:', e);
            }
            return g;
        });
    }

    function handleSquareClick(square) {
        if (game.isGameOver() || winner) return;

        // 1. Move Attempt
        if (selectedSquare) {
            if (selectedSquare === square) {
                setSelectedSquare(null);
                setPossibleMoves([]);
                return;
            }

            try {
                const gameCopy = new Chess(game.fen());
                const move = gameCopy.move({
                    from: selectedSquare,
                    to: square,
                    promotion: 'q'
                });

                if (move) {
                    // Update last move for highlighting
                    setLastMove({ from: move.from, to: move.to });

                    // Play Sound
                    if (move.captured) playSound('capture');
                    else playSound('move');

                    setGame(gameCopy);
                    setSelectedSquare(null);
                    setPossibleMoves([]);

                    // Check game over

                    if (connection) connection.send({ type: 'move', move });

                    // Auto-analyze
                    if (engine.current) {
                        setTimeout(() => analyzePosition(gameCopy.fen(), gameCopy.history().length), 100);
                    }
                    return;
                }
            } catch (e) {
                console.log('Invalid click move:', e);
            }
        }

        // 2. Select Piece
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            const isMyTurn = (internalSettings?.gameMode === 'computer') ?
                ((internalSettings.color === 'white' && game.turn() === 'w') || (internalSettings.color === 'black' && game.turn() === 'b')) :
                ((orientation === 'white' && game.turn() === 'w') || (orientation === 'black' && game.turn() === 'b'));

            if (isMyTurn || !connection) {
                setSelectedSquare(square);
                const moves = game.moves({ square, verbose: true }).map(m => m.to);
                setPossibleMoves(moves);
            }
        } else {
            setSelectedSquare(null);
            setPossibleMoves([]);
        }
    }

    // --- DRAG & DROP HANDLERS ---
    const handleDragStart = (e, square) => {
        if (game.isGameOver() || winner) return;

        const piece = game.get(square);
        if (!piece) return;

        const isMyTurn = (internalSettings?.gameMode === 'computer') ?
            ((internalSettings.color === 'white' && game.turn() === 'w') || (internalSettings.color === 'black' && game.turn() === 'b')) :
            ((orientation === 'white' && game.turn() === 'w') || (orientation === 'black' && game.turn() === 'b'));

        if (piece.color === game.turn() && (isMyTurn || !connection)) {
            setDraggedPiece(square);
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true }).map(m => m.to);
            setPossibleMoves(moves);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', square);
        } else {
            e.preventDefault();
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetSquare) => {
        e.preventDefault();

        if (!draggedPiece) return;

        try {
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move({
                from: draggedPiece,
                to: targetSquare,
                promotion: 'q'
            });

            if (move) {
                // Guardar último movimiento
                setLastMove({ from: move.from, to: move.to });

                // Play Sound
                if (move.captured) playSound('capture');
                else playSound('move');

                setGame(gameCopy);

                // Check game over

                if (connection) connection.send({ type: 'move', move });

                // Auto-analyze
                if (engine.current) {
                    setTimeout(() => analyzePosition(gameCopy.fen(), gameCopy.history().length), 100);
                }
            }
        } catch (e) {
            console.log('Invalid move');
        }

        setDraggedPiece(null);
        setSelectedSquare(null);
        setPossibleMoves([]);
    };

    const handleDragEnd = () => {
        setDraggedPiece(null);
    };

    const sendMessage = () => {
        if (!inputText.trim()) return;
        const msg = { sender: 'Tú', text: inputText };
        setMessages(prev => [...prev, msg]);
        if (connection) connection.send({ type: 'chat', message: inputText });
        setInputText('');
    };

    const handleResign = () => {
        if (window.confirm('¿Seguro que quieres rendirte?')) {
            if (connection) connection.send({ type: 'resign' });
            setWinner('Oponente (Rendición)');
            playSound('lose');
        }
    };

    const handleOfferDraw = () => {
        if (connection) connection.send({ type: 'offer-draw' });
        setLastToast({ sender: 'Sistema', text: 'Has ofrecido tablas', id: Date.now() });
    };

    const acceptDraw = () => {
        if (connection) connection.send({ type: 'draw-accepted' });
        setWinner('Tablas (Acuerdo)');
        setDrawOffer(false);
        playSound('draw');
    };

    const declineDraw = () => {
        if (connection) connection.send({ type: 'draw-declined' });
        setDrawOffer(false);
    };

    const formatTime = (seconds) => {
        if (seconds === null) return '--:--';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m + ':' + s.toString().padStart(2, '0');
    };

    // --- RENDER HELPERS ---
    const renderSquare = (i, j) => {
        const file = j;
        const rank = 7 - i;
        const square = String.fromCharCode(97 + file) + (rank + 1);

        const piece = game.get(square);
        const isDark = (i + j) % 2 === 1;
        const isSelected = selectedSquare === square;
        const isPossibleMove = possibleMoves.includes(square);
        const isLastMoveFrom = lastMove?.from === square;
        const isLastMoveTo = lastMove?.to === square;

        // Color de fondo con resaltado de último movimiento
        let backgroundColor;
        if (isSelected) {
            backgroundColor = 'rgba(255, 255, 0, 0.5)';
        } else if (isLastMoveFrom || isLastMoveTo) {
            // Resaltado más visible como en Lichess
            backgroundColor = isDark ? 'rgba(170, 162, 58, 1)' : 'rgba(205, 210, 106, 1)';
        } else {
            backgroundColor = isDark ? '#779954' : '#e9edcc';
        }

        return (
            <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
                style={{
                    width: '12.5%',
                    height: '12.5%',
                    backgroundColor,
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer'
                }}
            >
                {isPossibleMove && (
                    <div style={{
                        width: '20%',
                        height: '20%',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        position: 'absolute',
                        zIndex: 1
                    }} />
                )}
                {piece && (
                    <img
                        src={PIECE_IMAGES[piece.color][piece.type]}
                        alt={`${piece.color}${piece.type}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, square)}
                        onDragEnd={handleDragEnd}
                        style={{
                            width: '90%',
                            height: '90%',
                            cursor: piece.color === game.turn() ? 'grab' : 'default',
                            opacity: draggedPiece === square ? 0.5 : 1,
                            zIndex: 2
                        }}
                    />
                )}
                {j === 0 && <span style={{ position: 'absolute', top: 2, left: 2, fontSize: 10, color: isDark ? '#e9edcc' : '#779954', zIndex: 0 }}>{rank + 1}</span>}
                {i === 7 && <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 10, color: isDark ? '#e9edcc' : '#779954', zIndex: 0 }}>{String.fromCharCode(97 + file)}</span>}
            </div>
        );
    };

    const boardSquares = [];
    if (orientation === 'white') {
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) boardSquares.push(renderSquare(i, j));
    } else {
        for (let i = 7; i >= 0; i--) for (let j = 7; j >= 0; j--) boardSquares.push(renderSquare(i, j));
    }

    if (!internalSettings) return (
        <div style={{ color: 'white', padding: 20, textAlign: 'center' }}>
            <h2>Cargando configuración...</h2>
            <p>Esperando datos del anfitrión.</p>
            <button className="btn-secondary" onClick={onDisconnect} style={{ marginTop: 20 }}>
                Cancelar / Volver
            </button>
        </div>
    );

    return (
        <div className="game-container">
            {/* HEADER - Minimal */}
            <header className="game-header" style={{ justifyContent: 'space-between', padding: '0.5rem', minHeight: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#aaa', fontSize: '0.9rem' }}>
                        {winner ? `🏆 ${winner}` : (game.isCheck() ? '⚠️ JAQUE' : 'Partida en Curso')}
                    </div>

                    {/* Analysis Indicator */}
                    {engine.current && !game.isGameOver() && !winner && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 6px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: '#22c55e'
                        }}>
                            <span style={{
                                animation: 'pulse 1.5s ease-in-out infinite',
                                display: 'inline-block'
                            }}>🧠</span>
                            <span>Analizando</span>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {/* Video/Audio Controls */}
                    {connection && connection.peer && (
                        <>
                            {callStatus === 'connected' ? (
                                <button
                                    onClick={endCall}
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '0.8rem',
                                        background: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    title="Colgar"
                                >
                                    📞 Colgar
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => initiateCall('video')}
                                        disabled={callStatus !== 'idle'}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '0.8rem',
                                            background: callStatus !== 'idle' ? '#94a3b8' : '#3b82f6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            opacity: callStatus !== 'idle' ? 0.5 : 1
                                        }}
                                        title="Video Llamada"
                                    >
                                        📹
                                    </button>
                                    <button
                                        onClick={() => initiateCall('audio')}
                                        disabled={callStatus !== 'idle'}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '0.8rem',
                                            background: callStatus !== 'idle' ? '#94a3b8' : '#22c55e',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            opacity: callStatus !== 'idle' ? 0.5 : 1
                                        }}
                                        title="Llamada de Audio"
                                    >
                                        📞
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    <button onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Rotar</button>

                    {/* Game Controls */}
                    {!winner && !game.isGameOver() && internalSettings?.gameMode === 'p2p' && (
                        <>
                            <button
                                onClick={handleOfferDraw}
                                style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#eab308' }}
                                title="Ofrecer Tablas"
                            >
                                🤝
                            </button>
                            <button
                                onClick={handleResign}
                                style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#ef4444' }}
                                title="Rendirse"
                            >
                                🏳️
                            </button>
                        </>
                    )}

                    {/* Analysis Button - Only show when game is over */}
                    {(game.isGameOver() || winner) && analysisResults.length > 0 && (
                        <button
                            onClick={() => setIsAnalyzing(!isAnalyzing)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '0.8rem',
                                background: isAnalyzing ? '#ef4444' : '#22c55e'
                            }}
                        >
                            {isAnalyzing ? 'Cerrar' : '📊 Análisis'}
                        </button>
                    )}

                    <button className="secondary" onClick={onDisconnect} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Salir</button>
                </div>
            </header>

            {/* CALL REQUEST ALERT */}
            {callStatus === 'incoming' && (
                <div style={{
                    position: 'absolute',
                    top: '20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1e293b',
                    padding: '1rem 2rem',
                    borderRadius: '50px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    border: '1px solid #3b82f6',
                    animation: 'pulse 1.5s infinite'
                }}>
                    <div style={{ fontSize: '1.5rem', animation: 'bounce 1s infinite' }}>
                        {incomingCallType === 'video' ? '📹' : '📞'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>Llamada Entrante</div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                            {incomingCallType === 'video' ? 'Video Llamada' : 'Llamada de Audio'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={acceptCall}
                            style={{
                                background: '#22c55e',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '1.2rem'
                            }}
                        >
                            📞
                        </button>
                        <button
                            onClick={rejectCall}
                            style={{
                                background: '#ef4444',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '1.2rem'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* CALLING INDICATOR */}
            {callStatus === 'calling' && (
                <div style={{
                    position: 'absolute',
                    top: '20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '20px',
                    color: 'white',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span className="spinner">⌛</span> Llamando...
                    <button
                        onClick={() => {
                            setCallStatus('idle');
                            if (connection) connection.send({ type: 'call-ended' });
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                    >✕</button>
                </div>
            )}

            {/* VIDEO CHAT (New Component) */}
            {callStatus === 'connected' && (localStream || remoteStream) && (
                <VideoChat
                    localStream={localStream}
                    remoteStream={remoteStream}
                    onToggleVideo={handleToggleVideo}
                    onToggleAudio={handleToggleAudio}
                    onClose={endCall}
                    isVideoEnabled={isVideoEnabled}
                    isAudioEnabled={isAudioEnabled}
                    isMinimized={isVideoChatMinimized}
                    onToggleMinimize={() => setIsVideoChatMinimized(!isVideoChatMinimized)}
                />
            )}

            {/* DRAW OFFER ALERT */}
            {drawOffer && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#1e293b',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    zIndex: 2000,
                    textAlign: 'center',
                    border: '1px solid #3b82f6',
                    minWidth: '250px'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0' }}>🤝 Tablas?</h3>
                    <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>Tu oponente ofrece tablas.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            onClick={acceptDraw}
                            style={{
                                background: '#22c55e',
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Aceptar
                        </button>
                        <button
                            onClick={declineDraw}
                            style={{
                                background: '#ef4444',
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Rechazar
                        </button>
                    </div>
                </div>
            )}

            {/* CHAT TOGGLE FAB (Mobile) - Only show when chat is CLOSED */}
            {!isChatOpen && (
                <button
                    className="chat-toggle-btn"
                    onClick={() => {
                        setIsChatOpen(true);
                        setUnreadCount(0);
                    }}
                >
                    💬
                    {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                </button>
            )}

            {/* CHAT TOAST (Mobile) */}
            {lastToast && !isChatOpen && (
                <div className="chat-toast-container">
                    <div className="chat-toast">
                        <strong>{lastToast.sender}:</strong> {lastToast.text}
                    </div>
                </div>
            )}

            {/* MAIN LAYOUT */}
            <div className="game-layout">
                {/* BOARD */}
                <div className="board-section">

                    {/* OPPONENT INFO (Top) */}
                    <div className="player-info" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', marginBottom: '8px', color: '#ccc', padding: '0 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', background: '#333', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>👤</div>
                            <span style={{ fontSize: '1rem', fontWeight: '500' }}>Oponente</span>
                        </div>
                        <div className="timer" style={{
                            fontSize: '1.2rem',
                            fontFamily: 'monospace',
                            background: (orientation === 'white' ? blackTime : whiteTime) < 20 ? '#7f1d1d' : 'rgba(0,0,0,0.4)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            minWidth: '70px',
                            textAlign: 'center',
                            color: (orientation === 'white' ? blackTime : whiteTime) < 30 ? '#ff4d4d' : '#fff',
                            fontWeight: 'bold',
                            flexShrink: 0
                        }}>
                            {formatTime(orientation === 'white' ? blackTime : whiteTime)}
                        </div>
                    </div>

                    <div className="native-board-container">
                        {boardSquares}
                    </div>

                    {/* SELF INFO (Bottom) */}
                    <div className="player-info" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', marginTop: '8px', color: 'white', padding: '0 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', background: '#4CAF50', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' }}>👤</div>
                            <span style={{ fontSize: '1rem', fontWeight: '500' }}>Tú</span>
                        </div>
                        <div className="timer" style={{
                            fontSize: '1.2rem',
                            fontFamily: 'monospace',
                            background: (orientation === 'white' ? whiteTime : blackTime) < 20 ? '#7f1d1d' : 'rgba(0,0,0,0.4)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            minWidth: '70px',
                            textAlign: 'center',
                            color: (orientation === 'white' ? whiteTime : blackTime) < 30 ? '#ff4d4d' : '#fff',
                            fontWeight: 'bold',
                            flexShrink: 0
                        }}>
                            {formatTime(orientation === 'white' ? whiteTime : blackTime)}
                        </div>
                    </div>

                </div>

                {/* ANALYSIS PANEL */}
                {isAnalyzing && analysisResults.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '60px',
                        right: '10px',
                        width: '300px',
                        maxHeight: '500px',
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '1rem',
                        zIndex: 1000,
                        overflowY: 'auto'
                    }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>📊 Análisis de Stockfish</h3>

                        {/* Legend */}
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            marginBottom: '1rem',
                            padding: '0.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '4px'
                        }}>
                            <div style={{ marginBottom: '0.25rem' }}>🟩 Verde = Ventaja blancas</div>
                            <div style={{ marginBottom: '0.25rem' }}>🟥 Rojo = Ventaja negras</div>
                            <div>Número = Evaluación en peones</div>
                        </div>

                        {/* Evaluation Graph */}
                        <div style={{
                            background: '#0f172a',
                            padding: '1rem',
                            borderRadius: '6px',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                Evaluación por jugada
                            </div>
                            <div style={{
                                display: 'flex',
                                height: '100px',
                                alignItems: 'center',
                                gap: '2px'
                            }}>
                                {analysisResults.map((result, i) => {
                                    if (!result) return null;
                                    const score = Math.max(-5, Math.min(5, result.score));
                                    const height = ((score + 5) / 10) * 100;
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                flex: 1,
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-end'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    height: `${height}%`,
                                                    background: score > 0 ? '#22c55e' : '#ef4444',
                                                    borderRadius: '2px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onClick={() => setCurrentAnalysisMove(i)}
                                                title={`Jugada ${i + 1}: ${score > 0 ? '+' : ''}${score.toFixed(2)}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Statistics & Engine Detection */}
                        {(() => {
                            const stats = detectEngineUsage();
                            if (!stats) return null;

                            return (
                                <div style={{
                                    background: stats.suspicious ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                    border: `1px solid ${stats.suspicious ? '#ef4444' : '#22c55e'}`,
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    marginBottom: '1rem'
                                }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        {stats.suspicious ? '⚠️ Posible uso de motor' : '✅ Juego humano'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                                        <div>Precisión: {stats.accuracy}%</div>
                                        <div>Jugadas perfectas: {stats.perfectMoves}/{stats.totalMoves} ({stats.perfectRate}%)</div>
                                        <div>Jugadas buenas: {stats.goodMoves}/{stats.totalMoves}</div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Move List */}
                        <div style={{ fontSize: '0.85rem' }}>
                            <div style={{ color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 'bold' }}>Jugadas analizadas:</div>
                            {analysisResults.map((result, i) => {
                                if (!result) return null;
                                const moveNum = Math.floor(i / 2) + 1;
                                const isWhite = i % 2 === 0;
                                const moveLabel = isWhite ? `${moveNum}.` : `${moveNum}...`;

                                // Classify move quality
                                let classification = { type: 'ok', label: '', color: '#94a3b8' };
                                if (i > 0 && analysisResults[i - 1]) {
                                    classification = classifyMove(analysisResults[i - 1].score, result.score);
                                }

                                return (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '0.5rem',
                                            background: currentAnalysisMove === i ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                                            borderRadius: '4px',
                                            marginBottom: '0.25rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            border: currentAnalysisMove === i ? '1px solid #3b82f6' : '1px solid transparent'
                                        }}
                                        onClick={() => setCurrentAnalysisMove(i)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ color: isWhite ? '#fff' : '#94a3b8', fontWeight: 'bold' }}>{moveLabel}</span>
                                            <span style={{ color: '#cbd5e1' }}>Jugada {i + 1}</span>
                                            {classification.label && (
                                                <span style={{
                                                    color: classification.color,
                                                    fontWeight: 'bold',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {classification.label}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{
                                            color: result.score > 0 ? '#22c55e' : '#ef4444',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem'
                                        }}>
                                            {result.score > 0 ? '+' : ''}{result.score.toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
                }

                {/* CHAT */}
                <div className={`chat-section ${isChatOpen ? 'open' : ''}`}>
                    <div className="chat-header">
                        <span>Chat de Partida</span>
                        <button
                            className="secondary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                            onClick={() => setIsChatOpen(false)}
                        >
                            ▼
                        </button>
                    </div>
                    <div className="chat-messages">
                        <div className="message system">Inicio de la partida</div>
                        {messages.map((msg, i) => (
                            <div key={i} className={`message ${msg.sender === 'Tú' ? 'own' : 'opponent'}`}>
                                {msg.type === 'voice' ? (
                                    <div className="voice-message">
                                        <button onClick={() => {
                                            const audio = new Audio(msg.audio);
                                            audio.play();
                                        }} style={{
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            border: 'none',
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            color: '#3b82f6',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}>
                                            ▶️ Mensaje de voz ({msg.duration}s)
                                        </button>
                                    </div>
                                ) : (
                                    <><strong>{msg.sender}:</strong> {msg.text}</>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* QUICK CHAT & EMOJIS */}
                    <div className="quick-actions" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', background: 'var(--surface-color)' }}>
                        {['👍', '👏', '😂', '🤔', '😭', '😡'].map(emoji => (
                            <button key={emoji} className="secondary" style={{ padding: '0.3rem', fontSize: '1.2rem', minWidth: 'auto' }} onClick={() => {
                                setInputText(prev => prev + emoji);
                            }}>{emoji}</button>
                        ))}
                    </div>
                    <div className="quick-chat" style={{ padding: '0 0.5rem 0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'var(--surface-color)' }}>
                        {['Hola', 'Buena partida', 'Gracias', 'Ups', 'Jaque', 'Rematch?'].map(text => (
                            <button key={text} className="secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={() => {
                                const msg = { sender: 'Tú', text };
                                setMessages(prev => [...prev, msg]);
                                if (connection) connection.send({ type: 'chat', message: text });
                            }}>{text}</button>
                        ))}
                    </div>

                    <div className="chat-input">
                        {/* Botón de audio estilo WhatsApp */}
                        <button
                            className="voice-btn"
                            onMouseDown={startRecording}
                            onMouseUp={handleVoiceMessage}
                            onTouchStart={startRecording}
                            onTouchEnd={handleVoiceMessage}
                            style={{
                                background: isRecording ? '#ef4444' : '#3b82f6',
                                border: 'none',
                                padding: '0.6rem',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                transition: 'all 0.2s',
                                minWidth: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {isRecording ? `🔴 ${recordingTime}s` : '🎤'}
                        </button>
                        <input
                            type="text"
                            placeholder="Escribe..."
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && sendMessage()}
                        />
                        <button onClick={sendMessage}>Enviar</button>
                    </div>
                </div>
            </div >
        </div >
    );
};

// --- SOUNDS ---
const SOUNDS = {
    move: new Audio('/sounds/move.mp3'),
    capture: new Audio('/sounds/capture.mp3'),
    notify: new Audio('/sounds/notify.mp3'),
    check: new Audio('/sounds/check.mp3'),
    castle: new Audio('/sounds/castle.mp3'),
    win: new Audio('/sounds/win.mp3'),
    lose: new Audio('/sounds/lose.mp3'),
    draw: new Audio('/sounds/draw.mp3')
};

const playSound = (type) => {
    try {
        console.log(`Attempting to play sound: ${type}`);
        if (SOUNDS[type]) {
            SOUNDS[type].currentTime = 0;
            const promise = SOUNDS[type].play();
            if (promise !== undefined) {
                promise.then(() => {
                    console.log(`Sound ${type} played successfully`);
                }).catch(error => {
                    console.error(`Audio play failed for ${type}:`, error);
                });
            }
        } else {
            console.warn(`Sound ${type} not found in SOUNDS object`);
        }
    } catch (e) {
        console.error("Critical error in playSound:", e);
    }
};

export default Game;
