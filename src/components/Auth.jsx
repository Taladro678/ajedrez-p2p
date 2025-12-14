import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';

const Auth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Check for redirect result on component mount
    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    console.log('Signed in via redirect:', result.user.displayName);
                    // Get the Google Access Token from redirect
                    const credential = GoogleAuthProvider.credentialFromResult(result);
                    const token = credential.accessToken;
                    if (token) {
                        sessionStorage.setItem('google_access_token', token);
                    }
                }
            } catch (error) {
                console.error('Error getting redirect result:', error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    alert('Error al iniciar sesión: ' + error.message);
                }
            }
        };
        checkRedirectResult();
    }, []);

    const isMobile = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        // Request access to create/edit files created by this app
        provider.addScope('https://www.googleapis.com/auth/drive.file');

        try {
            if (isMobile()) {
                // Use redirect for mobile devices
                console.log('Using redirect for mobile device');
                await signInWithRedirect(auth, provider);
            } else {
                // Use popup for desktop
                console.log('Using popup for desktop');
                const result = await signInWithPopup(auth, provider);

                // Get the Google Access Token
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential.accessToken;
                if (token) {
                    sessionStorage.setItem('google_access_token', token);
                }

                console.log('Signed in:', result.user.displayName);
            }
        } catch (error) {
            console.error('Error signing in:', error);
            if (error.code !== 'auth/popup-closed-by-user') {
                alert('Error al iniciar sesión: ' + error.message);
            }
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--bg-color)',
                color: 'var(--on-background)'
            }}>
                <div>Cargando...</div>
            </div>
        );
    }

    if (user) {
        // User is signed in, return null (user info shown in Lobby)
        return null;
    }

    // User is not signed in, show login screen
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'var(--bg-color)',
            gap: '2rem'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--on-background)' }}>
                    ♞ Ajedrez P2P
                </h1>
                <p style={{ color: 'var(--secondary-color)', fontSize: '1.1rem' }}>
                    Juega ajedrez online con tus amigos
                </p>
            </div>

            <button
                onClick={handleGoogleSignIn}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '0.8rem 1.5rem',
                    fontSize: '1rem',
                    background: 'white',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)'}
                onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'}
            >
                <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar con Google
            </button>

            <div style={{
                textAlign: 'center',
                color: 'var(--secondary-color)',
                fontSize: '0.85rem',
                maxWidth: '400px'
            }}>
                <p>Inicia sesión para guardar tu progreso y jugar con amigos</p>
            </div>
        </div>
    );
};

export default Auth;
