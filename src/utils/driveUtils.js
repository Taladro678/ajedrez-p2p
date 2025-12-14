// Google Drive API utilities for saving chess games

/**
 * Initialize Google Drive API client
 */
export const initDriveClient = () => {
    return new Promise((resolve, reject) => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: 'AIzaSyB3Atm5pCVONvW_-Qsu9CvpCFf1DE3JdVw',
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                });
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};

/**
 * Set access token for Drive API
 */
export const setDriveToken = (token) => {
    if (window.gapi && window.gapi.client) {
        gapi.client.setToken({ access_token: token });
    }
};

/**
 * Find or create "Ajedrez P2P" folder in Drive
 */
export const getOrCreateChessFolder = async () => {
    try {
        // Search for existing folder
        const response = await gapi.client.drive.files.list({
            q: "name='Ajedrez P2P' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0].id;
        }

        // Create folder if it doesn't exist
        const folderMetadata = {
            name: 'Ajedrez P2P',
            mimeType: 'application/vnd.google-apps.folder'
        };

        const folder = await gapi.client.drive.files.create({
            resource: folderMetadata,
            fields: 'id'
        });

        return folder.result.id;
    } catch (error) {
        console.error('Error creating/finding folder:', error);
        throw error;
    }
};

/**
 * Save PGN file to Google Drive
 * @param {string} pgn - PGN content
 * @param {string} filename - Name of the file
 * @param {string} folderId - Parent folder ID
 */
export const savePGNToDrive = async (pgn, filename, folderId) => {
    try {
        const file = new Blob([pgn], { type: 'text/plain' });
        const metadata = {
            name: filename,
            mimeType: 'text/plain',
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const token = localStorage.getItem('driveAccessToken');

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: form
        });

        if (!response.ok) {
            throw new Error('Failed to upload file to Drive');
        }

        const result = await response.json();
        console.log('File saved to Drive:', result);
        return result;
    } catch (error) {
        console.error('Error saving to Drive:', error);
        throw error;
    }
};

/**
 * Generate PGN from chess game
 * @param {Chess} game - chess.js instance
 * @param {object} metadata - Game metadata (players, result, etc.)
 */
export const generatePGN = (game, metadata) => {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '.');

    let pgn = `[Event "Ajedrez P2P"]\n`;
    pgn += `[Site "Web App"]\n`;
    pgn += `[Date "${dateStr}"]\n`;
    pgn += `[Round "1"]\n`;
    pgn += `[White "${metadata.white || 'Jugador 1'}"]\n`;
    pgn += `[Black "${metadata.black || 'Jugador 2'}"]\n`;
    pgn += `[Result "${metadata.result || '*'}"]\n`;
    pgn += `[TimeControl "${metadata.timeControl || '10+0'}"]\n`;
    pgn += `\n`;

    // Get moves from chess.js
    const history = game.history({ verbose: true });
    let moveText = '';

    for (let i = 0; i < history.length; i++) {
        if (i % 2 === 0) {
            moveText += `${Math.floor(i / 2) + 1}. `;
        }
        moveText += history[i].san + ' ';
    }

    pgn += moveText.trim();
    pgn += ` ${metadata.result || '*'}\n`;

    return pgn;
};

/**
 * Auto-save game to Drive
 * @param {Chess} game - chess.js instance
 * @param {object} metadata - Game metadata
 */
export const autoSaveGameToDrive = async (game, metadata) => {
    try {
        // Check if user has Drive token
        const token = localStorage.getItem('driveAccessToken');
        if (!token) {
            console.log('No Drive token, skipping auto-save');
            return null;
        }

        // Generate PGN
        const pgn = generatePGN(game, metadata);

        // Create filename
        const date = new Date().toISOString().split('T')[0];
        const opponent = metadata.opponent || 'Oponente';
        const gameResult = metadata.result || 'ongoing';
        const filename = `${date}_${opponent}_${gameResult}.pgn`;

        // Get or create folder
        const folderId = await getOrCreateChessFolder();

        // Save to Drive
        const result = await savePGNToDrive(pgn, filename, folderId);

        console.log('Game auto-saved to Drive:', filename);
        return result;
    } catch (error) {
        console.error('Error auto-saving game:', error);
        // Don't throw - auto-save is optional
        return null;
    }
};
