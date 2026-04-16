import { create } from "zustand";

const useGameStore = create((set, get) => ({
  connected: false,
  socketId: null,
  playerId: null,
  playerName: "",
  isHost: false,
  isSpectator: false,
  lobbyCode: null,
  players: [],
  hostId: null,
  totalRounds: 3,
  phase: "LOBBY",
  lang: "en", // "en" | "ar"

  myWord: null,
  roundNumber: 0,
  totalTurns: 0,

  currentTurnPlayerId: null,
  currentTurnIndex: 0,
  turnDuration: 7000,
  turnStartTime: null,
  lap: 1,
  totalLaps: 3,

  myVote: null,
  voteCount: 0,

  results: null,
  strokeHistory: [],
  roundStrokes: [],

  reactions: [],
  chatMessages: [],
  errorMessage: null,

  setConnected: (connected) => set({ connected }),
  setSocketId: (socketId) => set({ socketId }),
  setPlayerName: (playerName) => set({ playerName }),
  setError: (errorMessage) => set({ errorMessage }),
  clearError: () => set({ errorMessage: null }),

  setLang: (lang) => set({ lang }),

  onJoinedLobby: ({ playerId, lobbyCode, isHost, isSpectator, players, hostId }) => {
    set({ playerId, lobbyCode, isHost, isSpectator, players, hostId,
          phase: "LOBBY", myWord: null, myVote: null, results: null, chatMessages: [] });
  },

  onLobbyUpdate: ({ players, hostId, phase, totalRounds, lobbyCode, lang }) => {
    set((state) => ({
      players,
      hostId,
      totalRounds: totalRounds ?? state.totalRounds,
      lobbyCode: lobbyCode ?? state.lobbyCode,
      isHost: state.playerId === hostId,
      lang: lang ?? state.lang,
    }));
  },

  onPhaseChange: ({ phase }) => {
    set({ phase });
    if (phase === "VOTING") set({ myVote: null, voteCount: 0 });
    if (phase === "LOBBY") set({ myWord: null, results: null, strokeHistory: [], roundStrokes: [] });
  },

  onYourWord: ({ word, roundNumber, totalRounds, totalTurns }) => {
    set({ myWord: word, roundNumber, totalRounds, totalTurns });
  },

  onYourWordReminder: ({ word }) => {
    set((state) => ({ myWord: state.myWord || word }));
  },

  onCanvasClear: () => {
    set({ roundStrokes: [] });
  },

  onTurnStart: ({ playerId, turnIndex, totalTurns, duration, lap, totalLaps }) => {
    set({ currentTurnPlayerId: playerId, currentTurnIndex: turnIndex,
          totalTurns, turnDuration: duration, turnStartTime: Date.now(),
          lap: lap ?? 1, totalLaps: totalLaps ?? 5 });
  },

  onTurnEnd: () => {},

  onVotingStart: ({ players }) => {
    set({ players, voteCount: 0, myVote: null });
  },

  onVoteUpdate: ({ voteCount }) => set({ voteCount }),
  setMyVote: (targetId) => set({ myVote: targetId }),

  onResults: (results) => {
    set({ results, strokeHistory: results.replay || [], roundStrokes: results.roundStrokes || [] });
  },

  onReaction: ({ playerId, playerName, emoji }) => {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({ reactions: [...state.reactions, { id, playerId, playerName, emoji }] }));
    setTimeout(() => {
      set((state) => ({ reactions: state.reactions.filter((r) => r.id !== id) }));
    }, 2200);
  },

  onChatMessage: (msg) => {
    set((state) => ({ chatMessages: [...state.chatMessages.slice(-49), msg] }));
  },

  onPlayerDisconnected: ({ playerId }) => {
    set((state) => ({
      players: state.players.map((p) => p.id === playerId ? { ...p, isConnected: false } : p),
    }));
  },

  onSpectatorSync: ({ phase, players, currentTurnPlayerId, roundStrokes }) => {
    set({ phase, players, currentTurnPlayerId, roundStrokes: roundStrokes || [] });
  },

  getPlayer: (id) => get().players.find((p) => p.id === id),
  getMe: () => { const { players, playerId } = get(); return players.find((p) => p.id === playerId); },
}));

export default useGameStore;
