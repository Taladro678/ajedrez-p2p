
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FILENAME = 'ajedrez_p2p_backup.json';

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
    }
};
