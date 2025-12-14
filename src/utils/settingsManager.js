// Settings Manager - Manejo de configuraciones de usuario
const DEFAULT_SETTINGS = {
    sounds: {
        enabled: true,
        volume: 0.7,
        types: {
            move: true,
            capture: true,
            check: true,
            castle: true,
            promote: true,
            gameEnd: true
        }
    },
    gameplay: {
        premove: false,
        autoPromoteToQueen: true,
        promotionPiece: 'q', // q, r, b, n
        showLegalMoves: true,
        highlightLastMove: true
    },
    board: {
        theme: 'default',
        pieceSet: 'default',
        coordinates: true
    },
    analysis: {
        enabled: true,
        autoAnalyzeGames: true
    },
    antiCheat: {
        enabled: true,
        alertOpponent: true,
        trackTabSwitches: true,
        autoDisableAnalysisInP2P: true,
        engineDetection: true
    }
};

export const getSettings = () => {
    try {
        const saved = localStorage.getItem('chess_settings');
        if (saved) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return DEFAULT_SETTINGS;
};

export const saveSettings = (settings) => {
    try {
        localStorage.setItem('chess_settings', JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
};

export const resetSettings = () => {
    localStorage.removeItem('chess_settings');
    return DEFAULT_SETTINGS;
};
