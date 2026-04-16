import { useState, useRef, useEffect } from "react";
import useGameStore from "../state/gameStore";
import { getSocket } from "../hooks/useSocket";
import { useReplayCanvas } from "../hooks/useCanvas";
import { getT } from "../i18n/translations";

export default function ResultsScreen() {
  const { results, isHost, players, roundStrokes, lang } = useGameStore();
  const t = getT(lang);
  const isRtl = lang === "ar";
  const socket = getSocket();
  const [replayMode, setReplayMode] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => { const t = setTimeout(() => setRevealed(true), 600); return () => clearTimeout(t); }, []);

  if (!results) return null;

  const { imposterId, imposterName, imposterCaught, normalWord, imposterWord,
          voteDetails, voteTally, scores, roundNumber, totalRounds, isGameOver } = results;

  if (replayMode) {
    return <ReplayViewer roundStrokes={roundStrokes} players={players}
      normalWord={normalWord} imposterWord={imposterWord} imposterId={imposterId}
      strokeHistory={results.replay} lang={lang} onClose={() => setReplayMode(false)} />;
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center px-4 py-8 max-w-xl mx-auto">
      {/* Imposter reveal */}
      {revealed && (
        <div className="text-center mb-8 imposter-reveal">
          <div className="inline-block px-6 py-4 rounded-2xl mb-4"
            style={{ background: "var(--bg-card)",
                     border: `2px solid ${imposterCaught ? "var(--success)" : "var(--danger)"}` }}>
            <div className="text-5xl mb-3">{imposterCaught ? "🎯" : "🎭"}</div>
            <h2 className="text-3xl font-display font-extrabold mb-1">
              {imposterCaught ? t("imposterCaught") : t("imposterEscaped")}
            </h2>
            <p style={{ color: "var(--text-secondary)" }}>
              <span className="font-bold"
                style={{ color: players.find((p) => p.id === imposterId)?.color || "var(--accent-2)" }}>
                {imposterName}
              </span>{" "}{t("wasImposter")}
            </p>
          </div>
          <div className="flex gap-4 justify-center mt-4">
            <WordBadge label={t("normalWord")} word={normalWord} color="var(--success)" />
            <WordBadge label={t("imposterWord")} word={imposterWord} color="var(--danger)" />
          </div>
        </div>
      )}

      {/* Vote breakdown */}
      <div className="card w-full p-4 mb-4 animate-slide-up">
        <h3 className="font-display font-semibold mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("voteBreakdown")}
        </h3>
        {players.filter((p) => !p.isSpectator).map((target) => {
          const count = voteTally[target.id] || 0;
          const maxVotes = Math.max(...Object.values(voteTally || {}), 1);
          const isImposter = target.id === imposterId;
          return (
            <div key={target.id} className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="player-dot" style={{ background: target.color }} />
                <span className="text-sm font-semibold flex-1">{target.name}</span>
                {isImposter && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                    style={{ background: "var(--danger)", color: "white" }}>{t("imposterTag")}</span>
                )}
                <span className="font-mono text-sm">{count} {count === 1 ? t("vote") : t("votes")}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
                <div className="h-full rounded-full"
                  style={{ width: `${(count / maxVotes) * 100}%`,
                           background: isImposter ? "var(--danger)" : target.color,
                           transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Who voted for whom */}
      <div className="card w-full p-4 mb-4">
        <h3 className="font-display font-semibold mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("whoVotedWhom")}
        </h3>
        <div className="flex flex-col gap-2">
          {voteDetails.map((v, i) => {
            const voterColor = players.find((p) => p.id === v.voterId)?.color;
            const targetColor = players.find((p) => p.id === v.targetId)?.color;
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span style={{ color: voterColor }}>{v.voterName}</span>
                <span style={{ color: "var(--text-muted)" }}>{t("votedFor")}</span>
                <span style={{ color: targetColor }}>{v.targetName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="card w-full p-4 mb-4">
        <h3 className="font-display font-semibold mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("scoreboard")} — {t("round")} {roundNumber}/{totalRounds}
        </h3>
        {scores.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-lg mb-1"
            style={{ background: i === 0 ? "rgba(124,92,252,0.12)" : "transparent" }}>
            <span className="font-mono text-sm w-5" style={{ color: "var(--text-muted)" }}>{i + 1}.</span>
            <div className="player-dot" style={{ background: s.color }} />
            <span className="flex-1 font-semibold">{s.name}</span>
            <span className="font-mono font-bold" style={{ color: i === 0 ? "var(--accent)" : "var(--text-secondary)" }}>
              {s.score} pts
            </span>
            {i === 0 && <span>👑</span>}
          </div>
        ))}
      </div>

      <button className="btn-secondary w-full mb-4" onClick={() => setReplayMode(true)}>
        {t("watchReplay")}
      </button>

      {isHost && (
        <div className="w-full flex gap-3">
          {!isGameOver ? (
            <button className="btn-primary flex-1" onClick={() => socket.emit("next_round")}>
              {t("nextRound")}
            </button>
          ) : (
            <button className="btn-primary flex-1" onClick={() => socket.emit("reset_game")}>
              {t("backToLobby")}
            </button>
          )}
          <button className="btn-secondary" onClick={() => socket.emit("reset_game")}>{t("reset")}</button>
        </div>
      )}
      {!isHost && (
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{t("waitingForHost")}</p>
      )}
    </div>
  );
}

function WordBadge({ label, word, color }) {
  return (
    <div className="px-4 py-3 rounded-xl text-center"
      style={{ background: "var(--bg-raised)", border: `1px solid ${color}` }}>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="font-display font-extrabold text-lg" style={{ color }}>{word}</p>
    </div>
  );
}

function ReplayViewer({ roundStrokes, players, normalWord, imposterWord, imposterId, strokeHistory, lang, onClose }) {
  const t = getT(lang);
  const isRtl = lang === "ar";
  const canvasRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const { playReplay } = useReplayCanvas(canvasRef, roundStrokes);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }, []);

  const startReplay = () => {
    setPlaying(true);
    setDone(false);
    playReplay(() => { setPlaying(false); setDone(true); });
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center px-4 py-6 max-w-xl mx-auto">
      <div className="w-full flex items-center justify-between mb-4">
        <h2 className="text-2xl font-display font-bold">{t("drawingReplay")}</h2>
        <button className="btn-secondary py-2 px-4 text-sm" onClick={onClose}>← {t("back")}</button>
      </div>

      {/* Player legend with their words revealed */}
      <div className="w-full flex flex-wrap gap-2 mb-4">
        {strokeHistory?.map((entry) => {
          const player = players.find((p) => p.id === entry.playerId);
          return (
            <div key={`${entry.playerId}-${entry.turnIndex}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg-card)",
                       border: `1px solid ${entry.isImposter ? "var(--danger)" : "var(--border)"}` }}>
              <div className="player-dot" style={{ background: player?.color || "#888" }} />
              <span className="text-sm font-semibold">{entry.playerName}</span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ background: entry.isImposter ? "var(--danger)" : "var(--bg-raised)",
                         color: entry.isImposter ? "white" : "var(--text-secondary)" }}>
                {entry.word}
              </span>
              {entry.isImposter && <span className="text-xs">🕵️</span>}
            </div>
          );
        })}
      </div>

      <div className="w-full rounded-2xl overflow-hidden mb-4"
        style={{ aspectRatio: "1", background: "#1a1a2e", border: "2px solid var(--border)" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      <div className="w-full flex gap-3">
        <button className="btn-primary flex-1" onClick={startReplay} disabled={playing}>
          {playing ? t("playing") : done ? t("replayAgain") : t("playReplay")}
        </button>
      </div>
    </div>
  );
}
