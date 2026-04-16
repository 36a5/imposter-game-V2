import { useEffect } from "react";
import useGameStore from "./state/gameStore";
import { useSocket } from "./hooks/useSocket";
import Home from "./components/Home";
import Lobby from "./components/Lobby";
import WordReveal from "./components/WordReveal";
import DrawingCanvas from "./components/DrawingCanvas";
import VotingScreen from "./components/VotingScreen";
import ResultsScreen from "./components/ResultsScreen";

export default function App() {
  useSocket();
  const { phase, lobbyCode, connected, errorMessage, clearError, lang } = useGameStore();
  const isRtl = lang === "ar";

  useEffect(() => {
    const urlCode = window.location.pathname.match(/\/game\/([A-Z0-9]{6})/i)?.[1];
    if (urlCode) useGameStore.setState({ pendingLobbyCode: urlCode.toUpperCase() });
  }, []);

  // Apply RTL to document
  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [isRtl, lang]);

  const renderPhase = () => {
    if (!lobbyCode) return <Home />;
    switch (phase) {
      case "LOBBY": return <Lobby />;
      case "WORD_REVEAL": return <WordReveal />;
      case "DRAWING": return <DrawingCanvas />;
      case "VOTING": return <VotingScreen />;
      case "RESULTS": return <ResultsScreen />;
      default: return <Lobby />;
    }
  };

  return (
    <div className="relative">
      {!connected && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2"
          style={{ background: "var(--danger)", color: "white" }}>
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          {lang === "ar" ? "تحميل..." : "Reconnecting..."}
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 animate-slide-up"
          style={{ background: "var(--bg-card)", border: "1px solid var(--danger)", color: "var(--danger)", maxWidth: "90vw" }}>
          ⚠️ {errorMessage}
          <button onClick={clearError} style={{ color: "var(--text-muted)" }}>✕</button>
        </div>
      )}
      <div className="phase-enter" key={phase + lobbyCode}>{renderPhase()}</div>
    </div>
  );
}
