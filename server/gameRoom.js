/**
 * GameRoom.js — "Who Is The Imposter?"
 *
 * State machine: LOBBY → WORD_REVEAL → DRAWING → VOTING → RESULTS → LOBBY
 *
 * Drawing mechanic:
 *   - ONE shared canvas per round (relay style — everyone adds to the same drawing)
 *   - Canvas NEVER clears between turns, only between rounds
 *   - Each player gets TURNS_PER_PLAYER turns per round
 *   - Each turn lasts TURN_DURATION ms
 *   - Turn order cycles through all players TURNS_PER_PLAYER times
 */

const { getRandomPair } = require("./wordPairs");

const PHASES = {
  LOBBY: "LOBBY",
  WORD_REVEAL: "WORD_REVEAL",
  DRAWING: "DRAWING",
  VOTING: "VOTING",
  RESULTS: "RESULTS",
};

const WORD_REVEAL_DURATION = 5000;  // 5s to read word
const TURN_DURATION = 7000;         // 7s per turn
const TURN_END_BUFFER = 800;        // pause between turns
const VOTING_DURATION = 60000;      // 60s max voting
const TURNS_PER_PLAYER = 5;         // each player draws 5 times per round

const SCORE_NORMAL_CATCH = 2;
const SCORE_IMPOSTER_ESCAPE = 3;
const SCORE_IMPOSTER_CLOSE = 1;

class GameRoom {
  constructor(lobbyCode, hostId, emit, emitTo, onDestroy) {
    this.lobbyCode = lobbyCode;
    this.hostId = hostId;
    this.emit = emit;
    this.emitTo = emitTo;
    this.onDestroy = onDestroy;

    this.players = new Map();
    this.phase = PHASES.LOBBY;
    this.roundNumber = 0;
    this.totalRounds = 3;
    this.lang = "en"; // "en" | "ar"

    this.roles = new Map(); // never broadcast raw
    this.drawingOrder = []; // full sequence: [p1,p2,p3,p1,p2,p3,...] x TURNS_PER_PLAYER
    this.currentTurnIndex = 0;

    // Relay canvas: all strokes accumulate on one shared canvas per round
    this.roundStrokes = []; // { playerId, playerName, pathId, points[], color, lineWidth }

    // Per-turn stroke tracking for replay metadata
    this.strokeHistory = []; // { playerId, playerName, word, isImposter, turnIndex, strokes[] }
    this.currentTurnStrokes = [];

    this.votes = new Map();
    this.scores = new Map();
    this.customWordPairs = [];
    this._timers = [];
  }

  // ─── Player management ───────────────────────────────────────────

  addPlayer(socketId, playerName) {
    const isSpectator = this.phase !== PHASES.LOBBY;
    const player = {
      id: socketId,
      name: playerName,
      color: this._assignColor(),
      isConnected: true,
      isSpectator,
      isHost: socketId === this.hostId,
    };
    this.players.set(socketId, player);
    this.scores.set(socketId, 0);
    this._broadcastLobbyUpdate();
    if (isSpectator) this._sendCurrentStateToSpectator(socketId);
    return player;
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;
    player.isConnected = false;
    this.emit("player_disconnected", { playerId: socketId, playerName: player.name });

    if (
      this.phase === PHASES.DRAWING &&
      this.drawingOrder[this.currentTurnIndex] === socketId
    ) {
      this._clearTimers();
      this._advanceTurn();
    }

    if (socketId === this.hostId) {
      const next = [...this.players.values()].find((p) => p.isConnected && !p.isSpectator);
      if (next) {
        this.hostId = next.id;
        next.isHost = true;
        this._broadcastLobbyUpdate();
      }
    }

    const connected = [...this.players.values()].filter((p) => p.isConnected);
    if (connected.length === 0) {
      this._clearTimers();
      this.onDestroy();
    }
  }

  getActivePlayers() {
    return [...this.players.values()].filter((p) => p.isConnected && !p.isSpectator);
  }

  getPublicPlayers() {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isHost: p.isHost,
      isConnected: p.isConnected,
      isSpectator: p.isSpectator,
      score: this.scores.get(p.id) || 0,
    }));
  }

  // ─── State machine ────────────────────────────────────────────────

  startGame(socketId, options = {}) {
    if (socketId !== this.hostId) return { error: "only_host" };
    if (this.phase !== PHASES.LOBBY) return { error: "already_started" };
    const active = this.getActivePlayers();
    if (active.length < 3) return { error: "need_3" };
    if (active.length > 12) return { error: "max_12" };

    if (options.totalRounds) this.totalRounds = options.totalRounds;
    if (options.customWordPairs) this.customWordPairs = options.customWordPairs;
    if (options.lang) this.lang = options.lang;

    this.roundNumber = 1;
    this._startRound();
    return { ok: true };
  }

  _startRound() {
    this.roles.clear();
    this.votes.clear();
    this.roundStrokes = [];
    this.strokeHistory = [];
    this.currentTurnStrokes = [];

    const active = this.getActivePlayers();
    const shuffled = this._shuffle(active.map((p) => p.id));

    // Build full turn sequence: cycle through all players TURNS_PER_PLAYER times
    this.drawingOrder = [];
    for (let t = 0; t < TURNS_PER_PLAYER; t++) {
      this.drawingOrder.push(...shuffled);
    }
    this.currentTurnIndex = 0;

    // Assign roles
    const [normalWord, imposterWord] = getRandomPair(this.customWordPairs, this.lang);
    const imposterIndex = Math.floor(Math.random() * active.length);
    active.forEach((player, i) => {
      this.roles.set(player.id, {
        word: i === imposterIndex ? imposterWord : normalWord,
        isImposter: i === imposterIndex,
      });
    });

    this._setPhase(PHASES.WORD_REVEAL);

    // Send each player their private word
    for (const [playerId, role] of this.roles) {
      this.emitTo(playerId, "your_word", {
        word: role.word,
        roundNumber: this.roundNumber,
        totalRounds: this.totalRounds,
        totalTurns: this.drawingOrder.length,
      });
    }

    this._addTimer(() => this._startDrawingPhase(), WORD_REVEAL_DURATION);
  }

  _startDrawingPhase() {
    this._setPhase(PHASES.DRAWING);
    // Emit canvas clear signal for new round
    this.emit("canvas_clear", {});
    this.currentTurnIndex = 0;
    this._startTurn();
  }

  _startTurn() {
    // Skip disconnected players
    while (
      this.currentTurnIndex < this.drawingOrder.length &&
      !this.players.get(this.drawingOrder[this.currentTurnIndex])?.isConnected
    ) {
      this.currentTurnIndex++;
    }

    if (this.currentTurnIndex >= this.drawingOrder.length) {
      this._startVotingPhase();
      return;
    }

    const activePlayerId = this.drawingOrder[this.currentTurnIndex];
    const role = this.roles.get(activePlayerId);
    this.currentTurnStrokes = [];

    // Which "lap" are we on (1-indexed)
    const activePlayers = this.getActivePlayers().length;
    const lap = Math.floor(this.currentTurnIndex / activePlayers) + 1;

    this.emit("turn_start", {
      playerId: activePlayerId,
      playerName: this.players.get(activePlayerId)?.name,
      turnIndex: this.currentTurnIndex,
      totalTurns: this.drawingOrder.length,
      duration: TURN_DURATION,
      lap,
      totalLaps: TURNS_PER_PLAYER,
    });

    if (role) {
      this.emitTo(activePlayerId, "your_word_reminder", { word: role.word });
    }

    this._addTimer(() => this._endTurn(), TURN_DURATION);
  }

  _endTurn() {
    const activePlayerId = this.drawingOrder[this.currentTurnIndex];
    const role = this.roles.get(activePlayerId) || {};
    const player = this.players.get(activePlayerId) || {};

    // Save this turn's contribution to stroke history
    this.strokeHistory.push({
      playerId: activePlayerId,
      playerName: player.name,
      word: role.word,
      isImposter: role.isImposter,
      turnIndex: this.currentTurnIndex,
      strokes: [...this.currentTurnStrokes],
    });

    this.emit("turn_end", { playerId: activePlayerId });
    this.currentTurnIndex++;
    this._addTimer(() => this._startTurn(), TURN_END_BUFFER);
  }

  _advanceTurn() {
    this._endTurn();
  }

  _startVotingPhase() {
    this._setPhase(PHASES.VOTING);
    this.emit("voting_start", {
      players: this.getPublicPlayers().filter((p) => !p.isSpectator),
      duration: VOTING_DURATION,
    });
    this._addTimer(() => this._revealResults(), VOTING_DURATION);
  }

  submitVote(voterId, targetId) {
    if (this.phase !== PHASES.VOTING) return;
    const voter = this.players.get(voterId);
    if (!voter || voter.isSpectator) return;
    this.votes.set(voterId, targetId);
    this.emit("vote_update", { voteCount: this.votes.size });

    const eligible = this.getActivePlayers();
    if (this.votes.size >= eligible.length) {
      this._clearTimers();
      this._revealResults();
    }
  }

  _revealResults() {
    this._setPhase(PHASES.RESULTS);

    const voteTally = {};
    for (const [, targetId] of this.votes) {
      voteTally[targetId] = (voteTally[targetId] || 0) + 1;
    }

    let maxVotes = 0;
    let mostVotedId = null;
    for (const [targetId, count] of Object.entries(voteTally)) {
      if (count > maxVotes) { maxVotes = count; mostVotedId = targetId; }
    }

    let imposterId = null, normalWord = "", imposterWord = "";
    for (const [playerId, role] of this.roles) {
      if (role.isImposter) { imposterId = playerId; imposterWord = role.word; }
      else normalWord = role.word;
    }

    const imposterCaught = mostVotedId === imposterId;
    const votesAgainstImposter = voteTally[imposterId] || 0;
    this._applyScores(imposterId, imposterCaught, votesAgainstImposter, this.votes.size);

    const voteDetails = [];
    for (const [voterId, targetId] of this.votes) {
      voteDetails.push({
        voterId,
        voterName: this.players.get(voterId)?.name,
        targetId,
        targetName: this.players.get(targetId)?.name,
      });
    }

    this.emit("results", {
      imposterId,
      imposterName: this.players.get(imposterId)?.name,
      imposterCaught,
      normalWord,
      imposterWord,
      voteTally,
      voteDetails,
      scores: this._getScoreBoard(),
      replay: this.strokeHistory,
      roundStrokes: this.roundStrokes, // full relay canvas strokes
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      isGameOver: this.roundNumber >= this.totalRounds,
    });
  }

  nextRound(socketId) {
    if (socketId !== this.hostId) return;
    if (this.phase !== PHASES.RESULTS) return;
    if (this.roundNumber >= this.totalRounds) {
      this.roundNumber = 0;
      this._setPhase(PHASES.LOBBY);
      this._broadcastLobbyUpdate();
    } else {
      this.roundNumber++;
      this._startRound();
    }
  }

  resetGame(socketId) {
    if (socketId !== this.hostId) return;
    this._clearTimers();
    this.scores.clear();
    this.players.forEach((p) => {
      p.isSpectator = false;
      this.scores.set(p.id, 0);
    });
    this.roundNumber = 0;
    this._setPhase(PHASES.LOBBY);
    this._broadcastLobbyUpdate();
  }

  // ─── Drawing ─────────────────────────────────────────────────────

  handleStroke(socketId, strokeData) {
    if (this.phase !== PHASES.DRAWING) return;
    if (this.drawingOrder[this.currentTurnIndex] !== socketId) return;

    // Save to both relay canvas and current turn buffer
    this.roundStrokes.push(strokeData);
    this.currentTurnStrokes.push(strokeData);

    // Broadcast to everyone
    this.emit("stroke_update", strokeData);
  }

  // ─── Social ───────────────────────────────────────────────────────

  sendReaction(socketId, emoji) {
    const player = this.players.get(socketId);
    if (!player) return;
    this.emit("reaction", { playerId: socketId, playerName: player.name, emoji });
  }

  sendChat(socketId, message) {
    if (this.phase !== PHASES.LOBBY) return;
    const player = this.players.get(socketId);
    if (!player) return;
    this.emit("chat_message", {
      playerId: socketId,
      playerName: player.name,
      color: player.color,
      message: message.slice(0, 200),
    });
  }

  // ─── Host settings ────────────────────────────────────────────────

  setCustomWordPairs(socketId, pairs) {
    if (socketId !== this.hostId) return;
    this.customWordPairs = pairs;
  }

  setRoundCount(socketId, count) {
    if (socketId !== this.hostId) return;
    this.totalRounds = Math.min(10, Math.max(1, count));
    this._broadcastLobbyUpdate();
  }

  setLang(socketId, lang) {
    if (socketId !== this.hostId) return;
    if (lang === "en" || lang === "ar") {
      this.lang = lang;
      this._broadcastLobbyUpdate();
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  _setPhase(phase) {
    this.phase = phase;
    this.emit("phase_change", { phase });
  }

  _broadcastLobbyUpdate() {
    this.emit("lobby_update", {
      players: this.getPublicPlayers(),
      hostId: this.hostId,
      phase: this.phase,
      totalRounds: this.totalRounds,
      lobbyCode: this.lobbyCode,
      lang: this.lang,
    });
  }

  _applyScores(imposterId, imposterCaught, votesAgainstImposter, totalVotes) {
    if (imposterCaught) {
      for (const [voterId, targetId] of this.votes) {
        if (targetId === imposterId) {
          this.scores.set(voterId, (this.scores.get(voterId) || 0) + SCORE_NORMAL_CATCH);
        }
      }
      if (totalVotes - votesAgainstImposter <= 1) {
        this.scores.set(imposterId, (this.scores.get(imposterId) || 0) + SCORE_IMPOSTER_CLOSE);
      }
    } else {
      this.scores.set(imposterId, (this.scores.get(imposterId) || 0) + SCORE_IMPOSTER_ESCAPE);
    }
  }

  _getScoreBoard() {
    return [...this.players.values()]
      .map((p) => ({ id: p.id, name: p.name, color: p.color, score: this.scores.get(p.id) || 0 }))
      .sort((a, b) => b.score - a.score);
  }

  _sendCurrentStateToSpectator(socketId) {
    this.emitTo(socketId, "spectator_sync", {
      phase: this.phase,
      players: this.getPublicPlayers(),
      currentTurnPlayerId: this.drawingOrder[this.currentTurnIndex],
      roundStrokes: this.roundStrokes,
    });
  }

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _assignColor() {
    const colors = [
      "#FF6B6B","#FFD93D","#6BCB77","#4D96FF",
      "#FF6FC8","#FF9F45","#A29BFE","#00CEC9",
      "#FD79A8","#55EFC4","#FDCB6E","#74B9FF",
    ];
    const used = new Set([...this.players.values()].map((p) => p.color));
    return colors.find((c) => !used.has(c)) || colors[0];
  }

  _addTimer(fn, delay) {
    const id = setTimeout(fn, delay);
    this._timers.push(id);
    return id;
  }

  _clearTimers() {
    this._timers.forEach(clearTimeout);
    this._timers = [];
  }
}

module.exports = { GameRoom, PHASES };
