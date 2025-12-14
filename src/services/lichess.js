export const LICHESS_API_URL = 'https://lichess.org';
const CLIENT_ID = import.meta.env.VITE_LICHESS_CLIENT_ID || 'example-app-id';
const REDIRECT_URI = window.location.origin;

// Helper to generate random string for PKCE
function randomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Helper for SHA-256 (Web Crypto API)
async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(hash);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export const lichessAuth = {
    async login() {
        const state = randomString(32);
        const codeVerifier = randomString(128);
        const codeChallenge = await sha256(codeVerifier);

        localStorage.setItem('lichess_state', state);
        localStorage.setItem('lichess_verifier', codeVerifier);

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            scope: 'board:play challenge:read challenge:write', // Scopes needed for playing
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });

        window.location.href = `${LICHESS_API_URL}/oauth?${params.toString()}`;
    },

    async handleCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const storedState = localStorage.getItem('lichess_state');
        const codeVerifier = localStorage.getItem('lichess_verifier');

        if (state !== storedState) throw new Error('State mismatch');

        const response = await fetch(`${LICHESS_API_URL}/api/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                code_verifier: codeVerifier,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID
            })
        });

        const data = await response.json();
        if (data.access_token) {
            localStorage.setItem('lichess_token', data.access_token);
            // Clean URL but keep it simple, calling app should handle navigation if needed
            window.history.replaceState({}, document.title, "/");
            return data.access_token;
        } else {
            throw new Error('Failed to get token');
        }
    },

    getToken() {
        return localStorage.getItem('lichess_token');
    },

    logout() {
        localStorage.removeItem('lichess_token');
    }
};

export const lichessApi = {
    async getProfile() {
        const token = lichessAuth.getToken();
        if (!token) return null;
        const res = await fetch(`${LICHESS_API_URL}/api/account`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return res.json();
    },

    // Play against AI
    async createAiChallenge(level = 1, color = 'random') {
        const token = lichessAuth.getToken();
        const res = await fetch(`${LICHESS_API_URL}/api/challenge/ai`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                level,
                color
            })
        });
        return res.json();
    },

    async makeMove(gameId, move) {
        const token = lichessAuth.getToken();
        await fetch(`${LICHESS_API_URL}/api/board/game/${gameId}/move/${move}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    // Returns a ReadableStream
    async streamGame(gameId) {
        const token = lichessAuth.getToken();
        const response = await fetch(`${LICHESS_API_URL}/api/board/game/stream/${gameId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.body;
    }
};
