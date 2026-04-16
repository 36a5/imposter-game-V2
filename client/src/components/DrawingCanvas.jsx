import { useRef, useEffect, useState } from "react";
import useGameStore from "../state/gameStore";
import { useCanvas } from "../hooks/useCanvas";
import { getT } from "../i18n/translations";

const COLORS = ["#f0f0ff","#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#FF6FC8","#FF9F45","#A29BFE"];
const LINE_WIDTHS = [2, 4, 8, 16];

export default function DrawingCanvas() {
  const { players, playerId, currentTurnPlayerId, currentTurnIndex, totalTurns,
          turnDuration, turnStartTime, myWord, isSpectator, lap, totalLaps, lang } = useGameStore();
  const t = getT(lang);
  const isRtl = lang === "ar";

  const canvasRef = useRef(null);
  const [selectedColor, setSelectedColor] = useState("#f0f0ff");
  const [selectedWidth, setSelectedWidth] = useState(4);
  const [timeLeft, setTimeLeft] = useState(turnDuration);

  const isMyTurn = currentTurnPlayerId === playerId && !isSpectator;
  const currentPlayer = players.find((p) => p.id === currentTurnPlayerId);

  useCanvas(canvasRef, { isActive: isMyTurn, color: selectedColor, lineWidth: selectedWidth });

  // Countdown
  useEffect(() => {
    if (!turnStartTime) return;
    setTimeLeft(turnDuration);
    const interval = setInterval(() => {
      const remaining = Math.max(0, turnDuration - (Date.now() - turnStartTime));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [turnStartTime, turnDuration]);

  // Set canvas size on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
  }, []);

  const timerProgress = (timeLeft / turnDuration) * 100;
  const timerDanger = timerProgress < 33;

  // Active players (non-spectators)
  const activePlayers = players.filter((p) => !p.isSpectator);
  // Position within current lap
  const posInLap = activePlayers.length > 0 ? (currentTurnIndex % activePlayers.length) : 0;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: currentPlayer?.color || "var(--bg-raised)" }}>
            {currentPlayer?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-display font-bold leading-tight">
              {isMyTurn ? t("yourTurn") : `${currentPlayer?.name || "..."} ${t("isDrawing")}`}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("round")} {lap}/{totalLaps} · {t("turn")} {posInLap + 1}/{activePlayers.length}
            </p>
          </div>
        </div>

        {isMyTurn && myWord && (
          <div className="px-3 py-1 rounded-lg text-sm font-mono font-bold"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--accent)", color: "var(--accent)" }}>
            {myWord}
          </div>
        )}

        <div className="font-mono font-bold text-2xl"
          style={{ color: timerDanger ? "var(--danger)" : "var(--text-primary)", minWidth: "2ch", textAlign: "right" }}>
          {Math.ceil(timeLeft / 1000)}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1 w-full" style={{ background: "var(--bg-raised)" }}>
        <div className="h-full" style={{ width: `${timerProgress}%`,
          background: timerDanger ? "var(--danger)" : "var(--accent)",
          transition: "width 0.05s linear, background 0.3s" }} />
      </div>

      {/* Lap progress dots */}
      <div className="flex items-center justify-center gap-2 py-2"
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {isRtl ? `جولة ${lap} من ${totalLaps}` : `Lap ${lap} of ${totalLaps}`}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: totalLaps }).map((_, i) => (
            <div key={i} className="rounded-full transition-all"
              style={{ width: i < lap ? 16 : 8, height: 6,
                       background: i < lap ? "var(--accent)" : i === lap - 1 ? "var(--accent)" : "var(--border)" }} />
          ))}
        </div>
      </div>

      {/* Turn order strip */}
      <TurnOrderStrip players={activePlayers} currentTurnPlayerId={currentTurnPlayerId}
        currentTurnIndex={currentTurnIndex} totalLaps={totalLaps} />

      {/* Canvas */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        <div className="relative rounded-2xl overflow-hidden"
          style={{ width: "min(100%, 600px)", aspectRatio: "1", background: "#1a1a2e",
                   border: `2px solid ${isMyTurn ? "var(--accent)" : "var(--border)"}`,
                   boxShadow: isMyTurn ? "0 0 32px var(--accent-glow)" : "none",
                   transition: "box-shadow 0.3s, border-color 0.3s" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
          {!isMyTurn && !isSpectator && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <div className="px-3 py-1 rounded-full text-xs"
                style={{ background: "rgba(10,10,15,0.8)", color: "var(--text-muted)" }}>
                {t("watching")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tools */}
      {isMyTurn && (
        <div className="flex items-center justify-center gap-6 px-4 py-4"
          style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setSelectedColor(c)} className="rounded-full transition-all"
                style={{ width: selectedColor === c ? 28 : 22, height: selectedColor === c ? 28 : 22,
                         background: c, border: selectedColor === c ? "3px solid white" : "2px solid transparent",
                         outline: selectedColor === c ? "2px solid var(--accent)" : "none", transition: "all 0.15s" }} />
            ))}
          </div>
          <div style={{ width: 1, height: 32, background: "var(--border)" }} />
          <div className="flex gap-3 items-center">
            {LINE_WIDTHS.map((w) => (
              <button key={w} onClick={() => setSelectedWidth(w)} className="rounded-full transition-all"
                style={{ width: w + 8, height: w + 8,
                         background: selectedWidth === w ? selectedColor : "var(--border-bright)",
                         border: selectedWidth === w ? "2px solid var(--accent)" : "2px solid transparent",
                         transition: "all 0.15s" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TurnOrderStrip({ players, currentTurnPlayerId, currentTurnIndex, totalLaps }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
      style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
      {players.map((player) => {
        const isCurrent = player.id === currentTurnPlayerId;
        return (
          <div key={player.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg flex-shrink-0 transition-all"
            style={{ background: isCurrent ? "var(--accent)" : "transparent" }}>
            <div className="player-dot" style={{ background: player.color, width: 8, height: 8 }} />
            <span className="text-xs font-semibold"
              style={{ color: isCurrent ? "white" : "var(--text-secondary)" }}>
              {player.name.slice(0, 8)}
            </span>
            {isCurrent && <span className="text-xs">✏️</span>}
          </div>
        );
      })}
    </div>
  );
}
