const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now (dev)
        methods: ["GET", "POST"]
    }
});

// Store active games
// { id: 'peer-id', name: 'Player Name', elo: 1200, timeControl: '10+0' }
let games = [];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send current list to new user
    socket.emit('game_list_update', games);

    // User creates a game
    socket.on('create_game', (gameData) => {
        // gameData: { id, name, elo, timeControl, color }
        console.log('New Game:', gameData);
        games.push(gameData);
        io.emit('game_list_update', games); // Broadcast to all
    });

    // User joins a game (remove from list)
    socket.on('join_game', (gameId) => {
        console.log('Game Joined/Removed:', gameId);
        games = games.filter(g => g.id !== gameId);
        io.emit('game_list_update', games);
    });

    // User cancels/disconnects (remove their game if they hosted one)
    socket.on('remove_game', (gameId) => {
        games = games.filter(g => g.id !== gameId);
        io.emit('game_list_update', games);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Optional: Remove games hosted by this socket if we tracked socket-to-game mapping
        // For now, we rely on explicit 'remove_game' or 'join_game'
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Lobby Server running on port ${PORT}`);
});
