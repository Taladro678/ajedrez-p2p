import { useState, useEffect, useRef, useCallback } from 'react'
import Peer from 'peerjs'
import Lobby from './components/Lobby'
import Game from './components/Game'
import Auth from './components/Auth'
import LandingPage from './components/LandingPage'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { SettingsProvider } from './contexts/SettingsContext'
import { initSounds } from './utils/soundManager'
import './index.css'

import { lichessAuth } from './services/lichess'
import { LichessConnection } from './utils/lichessAdapter'

function App() {
  const [user, setUser] = useState(null)
  const [isGuest, setIsGuest] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [myId, setMyId] = useState('')
  const [conn, setConn] = useState(null)
  const [gameSettings, setGameSettings] = useState(null)
  const [hostedGameId, setHostedGameId] = useState(null)
  const peerRef = useRef(null)

  // Declare callback functions BEFORE useEffects that use them
  const setupConnection = useCallback((connection) => {
    connection.on('open', () => {
      console.log('Connected to:', connection.peer);
    });
    connection.on('close', () => {
      console.log('Connection closed');
      setIsConnected(false);
      setConn(null);
    });
    connection.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }, []);

  const handleConnect = useCallback((opponentId, settings, gameId = null) => {
    setGameSettings(settings);
    setHostedGameId(gameId);
    sessionStorage.setItem('gameSettings', JSON.stringify(settings));
    if (opponentId) sessionStorage.setItem('opponentId', opponentId);
    else sessionStorage.removeItem('opponentId');

    if (opponentId === 'COMPUTER') {
      setIsConnected(true);
      return;
    }

    if (opponentId && opponentId.startsWith('lichess:')) {
      const lichessGameId = opponentId.split(':')[1];
      const connection = new LichessConnection(lichessGameId, settings.color);
      setConn(connection);
      setupConnection(connection);
      setIsConnected(true);
      return;
    }

    if (!opponentId) {
      setIsConnected(true);
      return;
    }

    if (!peerRef.current) return;
    const connection = peerRef.current.connect(opponentId);
    setConn(connection);
    setupConnection(connection);
    setIsConnected(true);
  }, [setupConnection]);

  // Listen for auth state changes globally
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser ? currentUser.displayName : 'null');
      setUser(currentUser);

      if (currentUser) {
        initSounds();
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Lichess OAuth Callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('code') && params.get('state')) {
      lichessAuth.handleCallback().then(() => {
        console.log("Lichess Auth Successful");
      }).catch(err => console.error("Lichess Auth Error:", err));
    }
  }, []);

  useEffect(() => {
    const peer = new Peer(sessionStorage.getItem('myId') || undefined);
    peerRef.current = peer;
    window.peerInstance = peer; // Hacer accesible globalmente para useVideoChat

    peer.on('open', (id) => {
      setMyId(id);
      sessionStorage.setItem('myId', id);
    });

    peer.on('connection', (connection) => {
      setConn(connection);
      setIsConnected(true);
      setupConnection(connection);
    });

    // Restore Game State
    const savedSettings = sessionStorage.getItem('gameSettings');
    const savedOpponent = sessionStorage.getItem('opponentId');
    if (savedSettings) {
      setGameSettings(JSON.parse(savedSettings));
      if (savedOpponent) {
        if (savedOpponent.startsWith('lichess:')) {
          // Handle Lichess reconnect logic if needed, or just let user click resume
          // Current logic relies on 'myId' effect below to trigger reconnect
        }
      }
    }

    return () => {
      peer.destroy();
      window.peerInstance = null;
    };
  }, []);

  // Effect to handle auto-reconnect after peer open (P2P only mainly)
  useEffect(() => {
    if (myId && !isConnected) {
      const savedOpponent = sessionStorage.getItem('opponentId');
      if (savedOpponent && !savedOpponent.startsWith('lichess:')) {
        // Attempt reconnect
        handleConnect(savedOpponent, JSON.parse(sessionStorage.getItem('gameSettings')));
      }
    }
  }, [myId, isConnected, handleConnect]);



  const handleDisconnect = () => {
    if (conn) {
      conn.close();
    }
    setIsConnected(false);
    setConn(null);
    setGameSettings(null);
    setHostedGameId(null);
    sessionStorage.removeItem('gameSettings');
    sessionStorage.removeItem('opponentId');
  }

  return (
    <SettingsProvider>
      <div className="app-main">
        {(!user && !isGuest) ? (
          <LandingPage onGuestPlay={() => setIsGuest(true)} />
        ) : (
          <>
            {isConnected ? (
              <Game
                onDisconnect={handleDisconnect}
                connection={conn}
                settings={gameSettings}
                hostedGameId={hostedGameId}
                user={user}
                peer={peerRef.current}
              />
            ) : (
              <Lobby onConnect={handleConnect} myId={myId} user={user} />
            )}
          </>
        )}

      </div>
    </SettingsProvider>
  )
}

export default App
