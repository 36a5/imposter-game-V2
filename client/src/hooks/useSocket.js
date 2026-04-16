import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useGameStore from "../state/gameStore";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
let socketInstance = null;

export function useSocket() {
  const socketRef = useRef(null);
  const store = useGameStore();

  useEffect(() => {
    if (socketInstance) { socketRef.current = socketInstance; return; }

    const socket = io(SOCKET_URL, { transports: ["websocket"], autoConnect: true });
    socketInstance = socket;
    socketRef.current = socket;

    socket.on("connect", () => { store.setConnected(true); store.setSocketId(socket.id); });
    socket.on("disconnect", () => store.setConnected(false));
    socket.on("error", ({ message }) => {
      store.setError(message);
      setTimeout(() => store.clearError(), 4000);
    });

    socket.on("joined_lobby", (data) => store.onJoinedLobby(data));
    socket.on("lobby_update", (data) => store.onLobbyUpdate(data));
    socket.on("phase_change", (data) => store.onPhaseChange(data));
    socket.on("your_word", (data) => store.onYourWord(data));
    socket.on("your_word_reminder", (data) => store.onYourWordReminder(data));
    socket.on("canvas_clear", () => store.onCanvasClear());
    socket.on("turn_start", (data) => store.onTurnStart(data));
    socket.on("turn_end", (data) => store.onTurnEnd(data));
    socket.on("voting_start", (data) => store.onVotingStart(data));
    socket.on("vote_update", (data) => store.onVoteUpdate(data));
    socket.on("results", (data) => store.onResults(data));
    socket.on("reaction", (data) => store.onReaction(data));
    socket.on("chat_message", (data) => store.onChatMessage(data));
    socket.on("player_disconnected", (data) => store.onPlayerDisconnected(data));
    socket.on("spectator_sync", (data) => store.onSpectatorSync(data));
  }, []);

  return socketRef.current || socketInstance;
}

export function getSocket() { return socketInstance; }
