/**
 * index.js — "Who Is The Imposter?" Game Server
 * Express + Socket.io
 *
 * Manages lobby rooms and delegates all game logic to GameRoom instances.
 * The server is the single source of truth for roles, words, and game state.
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { GameRoom } = require("./gameRoom");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://d7oom-imposter.vercel.app", // your Vercel URL
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────
// In-memory game state
// Map<lobbyCode, GameRoom>
// ─────────────────────────────────────────────
const rooms = new Map();

// ─────────────────────────────────────────────
// REST endpoints
// ─────────────────────────────────────────────

/** Create a new lobby, return the code */
app.post("/api/create-lobby", (req, res) => {
  const lobbyCode = generateLobbyCode();
  res.json({ lobbyCode });
});

/** Check if a lobby exists */
app.get("/api/lobby/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: "Lobby not found" });
  res.json({
    exists: true,
    phase: room.phase,
    playerCount: room.getActivePlayers().length,
  });
});

// ─────────────────────────────────────────────
// Socket.io connection handler
// ─────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  let currentLobbyCode = null;

  // ── Join or create a lobby ──
  socket.on("join_lobby", ({ lobbyCode, playerName }) => {
    const code = (lobbyCode || "").toUpperCase().trim();
    const name = (playerName || "Player").trim().slice(0, 20);

    if (!code || code.length !== 6) {
      socket.emit("error", { message: "Invalid lobby code" });
      return;
    }

    let room = rooms.get(code);

    if (!room) {
      // Create new room — first joiner is host
      room = new GameRoom(
        code,
        socket.id,
        (event, payload) => io.to(code).emit(event, payload),
        (targetId, event, payload) => io.to(targetId).emit(event, payload),
        () => {
          rooms.delete(code);
          console.log(`[x] Room destroyed: ${code}`);
        }
      );
      rooms.set(code, room);
      console.log(`[+] Room created: ${code} by ${socket.id}`);
    }

    // Join the socket room
    socket.join(code);
    currentLobbyCode = code;

    const player = room.addPlayer(socket.id, name);
    console.log(`[>] ${name} (${socket.id}) joined ${code}`);

    // Confirm join to the new player
    socket.emit("joined_lobby", {
      playerId: socket.id,
      lobbyCode: code,
      isHost: player.isHost,
      isSpectator: player.isSpectator,
      players: room.getPublicPlayers(),
      hostId: room.hostId,
    });
  });

  // ── Host: start game ──
  socket.on("start_game", ({ totalRounds, customWordPairs, lang } = {}) => {
    const room = getRoom(socket);
    if (!room) return;
    const result = room.startGame(socket.id, { totalRounds, customWordPairs, lang });
    if (result?.error) socket.emit("error", { message: result.error });
  });

  // ── Host: set language ──
  socket.on("set_lang", ({ lang }) => {
    const room = getRoom(socket);
    if (!room) return;
    room.setLang(socket.id, lang);
  });

  // ── Drawing: stroke data from active player ──
  socket.on("drawing_stroke", (strokeData) => {
    const room = getRoom(socket);
    if (!room) return;
    room.handleStroke(socket.id, { ...strokeData, playerId: socket.id });
  });

  socket.on("drawing_end", () => {
    const room = getRoom(socket);
    if (!room) return;
    room.handleStrokeEnd(socket.id);
  });

  // ── Voting ──
  socket.on("submit_vote", ({ targetId }) => {
    const room = getRoom(socket);
    if (!room) return;
    room.submitVote(socket.id, targetId);
  });

  // ── Emoji reaction ──
  socket.on("send_reaction", ({ emoji }) => {
    const room = getRoom(socket);
    if (!room) return;
    const allowed = ["😂", "😱", "🤔", "👀", "🎨", "🕵️", "🔥", "💀", "🫡", "😤"];
    if (allowed.includes(emoji)) {
      room.sendReaction(socket.id, emoji);
    }
  });

  // ── Lobby chat ──
  socket.on("send_chat", ({ message }) => {
    const room = getRoom(socket);
    if (!room) return;
    room.sendChat(socket.id, message);
  });

  // ── Host: next round ──
  socket.on("next_round", () => {
    const room = getRoom(socket);
    if (!room) return;
    room.nextRound(socket.id);
  });

  // ── Host: reset to lobby ──
  socket.on("reset_game", () => {
    const room = getRoom(socket);
    if (!room) return;
    room.resetGame(socket.id);
  });

  // ── Host: set custom word pairs ──
  socket.on("set_custom_words", ({ pairs }) => {
    const room = getRoom(socket);
    if (!room) return;
    if (Array.isArray(pairs)) room.setCustomWordPairs(socket.id, pairs);
  });

  // ── Host: set round count ──
  socket.on("set_round_count", ({ count }) => {
    const room = getRoom(socket);
    if (!room) return;
    room.setRoundCount(socket.id, count);
  });

  // ── Disconnect ──
  socket.on("disconnect", () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
    if (currentLobbyCode) {
      const room = rooms.get(currentLobbyCode);
      if (room) room.removePlayer(socket.id);
    }
  });

  // ─────────────────────────────────────────────
  // Helper
  // ─────────────────────────────────────────────
  function getRoom(socket) {
    const code = currentLobbyCode;
    if (!code) {
      socket.emit("error", { message: "Not in a lobby" });
      return null;
    }
    const room = rooms.get(code);
    if (!room) {
      socket.emit("error", { message: "Lobby not found" });
      return null;
    }
    return room;
  }
});

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

function generateLobbyCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🕵️  Imposter Game Server running on port ${PORT}\n`);
});
