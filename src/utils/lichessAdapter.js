import { lichessApi } from '../services/lichess';

export class LichessConnection {
    constructor(gameId, initialColor) {
        this.gameId = gameId;
        this.peer = 'Lichess AI'; // Display name for opponent
        this.open = true;
        this.callbacks = {
            data: [],
            open: [],
            close: [],
            error: []
        };
        this.reader = null; // Stream reader
        this.myColor = initialColor || 'white';

        // Start streaming immediately
        this.connect();
    }

    async connect() {
        try {
            const stream = await lichessApi.streamGame(this.gameId);
            this.reader = stream.getReader();
            this.readStream();

            // Emit open event
            this.trigger('open');

            // Send initial settings to the game logic
            // We simulate receiving "settings" from the "opponent"
            // The Game component expects the opponent to send settings.
            const settings = {
                gameMode: 'p2p', // Treat as P2P so Game component waits for moves
                color: this.myColor === 'white' ? 'black' : 'white', // Opponent color
                timeControl: 'unlimited', // TODO: Parse from gameFull
            };
            this.trigger('data', { type: 'settings', settings });

        } catch (e) {
            console.error("Lichess stream error:", e);
            this.trigger('error', e);
        }
    }

    async readStream() {
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await this.reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const event = JSON.parse(line);
                    this.handleLichessEvent(event);
                } catch (e) {
                    console.error("Error parsing NDJSON:", e);
                }
            }
        }
    }

    handleLichessEvent(event) {
        if (event.type === 'gameFull') {
            this.myColor = (event.white.name === 'You' || event.white.id === lichessApi.getProfile()?.id) ? 'white' : 'black';
            // If playing against AI, we might not be authenticated as "id", check assumptions.
            // For now, assume 'initialColor' passed to constructor is correct if we created it.

            // Send connection initialized
            // Send moves if any exist
            const moves = event.state.moves.split(' ');
            if (moves.length > 0 && moves[0] !== '') {
                // We need to replay or sync. 
                // The Game component starts fresh. We might need to send all moves?
                // Or just the Fen? Game component doesn't accept FEN updates via P2P easily without refactor.
                // It accepts 'move' events.
                // Let's replay history? That might verify validity too.
                moves.forEach(move => {
                    this.trigger('data', { type: 'move', move: move });
                });
            }
        } else if (event.type === 'gameState') {
            // New move occurred
            const moves = event.moves.split(' ');
            const lastMove = moves[moves.length - 1];
            if (lastMove) {
                this.trigger('data', { type: 'move', move: lastMove });
            }

            // Check game over
            if (event.status !== 'started') {
                // Maybe trigger chat message for game outcome?
                // or just let the Game logic detect checkmate/draw?
                // Lichess status: mate, resign, outoftime, draw
            }
        }
    }

    send(data) {
        if (data.type === 'move') {
            // data.move is what Game.jsx sends.
            // Game.jsx sends internal chess.js move object OR result of .move()
            // Wait, looking at Game.jsx: connection.send({ type: 'move', move });
            // 'move' in Game.jsx is the object returned by chess.move().
            // It has .from and .to (e.g. 'e2', 'e4') and .promotion

            // We need to convert {from, to, promotion} to UCI string
            const moveObj = data.move;
            const uci = moveObj.from + moveObj.to + (moveObj.promotion || '');

            lichessApi.makeMove(this.gameId, uci).catch(e => console.error("Move failed", e));
        }
        else if (data.type === 'chat') {
            // Optional: Send chat
            // lichessApi.sendChat(this.gameId, data.message);
        }
    }

    on(event, cb) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(cb);
        }
    }

    off(event, cb) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(c => c !== cb);
        }
    }

    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    close() {
        this.open = false;
        if (this.reader) this.reader.cancel();
        this.trigger('close');
    }
}
