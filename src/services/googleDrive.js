
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FILENAME = 'ajedrez_p2p_backup.json';
const LICHESS_TOKEN_FILENAME = 'ajedrez_p2p_lichess_token.txt';

const getAccessToken = () => sessionStorage.getItem('google_access_token');

export const googleDriveService = {
    /**
     * Search for the backup file in Drive
     */
    async findBackupFile() {
        const token = getAccessToken();
        if (!token) throw new Error('No access token');

        const q = `name = '${BACKUP_FILENAME}' and trashed = false and 'root' in parents`;
        const response = await fetch(`${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error searching file');
        const data = await response.json();
        return data.files && data.files.length > 0 ? data.files[0] : null;
    },

    /**
     * Create or Update backup file
     */
    async uploadBackup(data) {
        const token = getAccessToken();
        if (!token) throw new Error('No authenticated');

        const fileContent = JSON.stringify(data);
        const existingFile = await this.findBackupFile();

        const metadata = {
            name: BACKUP_FILENAME,
            mimeType: 'application/json'
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        if (existingFile) {
            // UPDATE
            // For simple update of content only, we might use media upload, but multipart is safe for metadata too
            // Using PATCH on the file ID
            const response = await fetch(`${GOOGLE_DRIVE_UPLOAD_API}/files/${existingFile.id}?uploadType=multipart`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
                body: form
            });
            if (!response.ok) throw new Error('Error updating backup');
            return await response.json();
        } else {
            // CREATE
            const response = await fetch(`${GOOGLE_DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form
            });
            if (!response.ok) throw new Error('Error creating backup');
            return await response.json();
        }
    },

    /**
     * Read backup content
     */
    async restoreBackup() {
        const token = getAccessToken();
        if (!token) throw new Error('No authenticated');

        const existingFile = await this.findBackupFile();
        if (!existingFile) throw new Error('Backup not found');

        const response = await fetch(`${GOOGLE_DRIVE_API}/files/${existingFile.id}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error downloading backup');
        return await response.json();
    },

    /**
     * Find Lichess token file in Drive
     */
    async findLichessTokenFile() {
        const token = getAccessToken();
        if (!token) return null;

        try {
            const q = `name = '${LICHESS_TOKEN_FILENAME}' and trashed = false and 'root' in parents`;
            const response = await fetch(`${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(q)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return null;
            const data = await response.json();
            return data.files && data.files.length > 0 ? data.files[0] : null;
        } catch (error) {
            console.error('Error finding Lichess token file:', error);
            return null;
        }
    },

    /**
     * Save Lichess token to Google Drive
     */
    async saveLichessToken(lichessToken) {
        const token = getAccessToken();
        if (!token) {
            console.warn('No Google access token, skipping Lichess token sync');
            return;
        }

        try {
            const existingFile = await this.findLichessTokenFile();

            const metadata = {
                name: LICHESS_TOKEN_FILENAME,
                mimeType: 'text/plain'
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([lichessToken], { type: 'text/plain' }));

            if (existingFile) {
                // UPDATE
                const response = await fetch(`${GOOGLE_DRIVE_UPLOAD_API}/files/${existingFile.id}?uploadType=multipart`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` },
                    body: form
                });
                if (!response.ok) throw new Error('Error updating Lichess token');
                console.log('Lichess token updated in Google Drive');
            } else {
                // CREATE
                const response = await fetch(`${GOOGLE_DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: form
                });
                if (!response.ok) throw new Error('Error creating Lichess token file');
                console.log('Lichess token saved to Google Drive');
            }
        } catch (error) {
            console.error('Error saving Lichess token to Drive:', error);
        }
    },

    /**
     * Get Lichess token from Google Drive
     */
    async getLichessToken() {
        const token = getAccessToken();
        if (!token) return null;

        try {
            const existingFile = await this.findLichessTokenFile();
            if (!existingFile) return null;

            const response = await fetch(`${GOOGLE_DRIVE_API}/files/${existingFile.id}?alt=media`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return null;
            const lichessToken = await response.text();
            console.log('Lichess token restored from Google Drive');
            return lichessToken;
        } catch (error) {
            console.error('Error getting Lichess token from Drive:', error);
            return null;
        }
    },

    /**
     * Delete Lichess token from Google Drive
     */
    async deleteLichessToken() {
        const token = getAccessToken();
        if (!token) return;

        try {
            const existingFile = await this.findLichessTokenFile();
            if (!existingFile) return;

            const response = await fetch(`${GOOGLE_DRIVE_API}/files/${existingFile.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                console.log('Lichess token deleted from Google Drive');
            }
        } catch (error) {
            console.error('Error deleting Lichess token from Drive:', error);
        }
    }
};

