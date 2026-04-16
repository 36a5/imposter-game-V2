import { useState } from "react";
import useGameStore from "../state/gameStore";
import { getSocket } from "../hooks/useSocket";
import { getT } from "../i18n/translations";

const EMOJI_OPTIONS = ["😂","😱","🤔","👀","🎨","🕵️","🔥","💀","🫡","😤"];

export default function VotingScreen() {
  const { players, playerId, myVote, voteCount, isSpectator, reactions, setMyVote, lang } = useGameStore();
  const t = getT(lang);
  const isRtl = lang === "ar";
  const socket = getSocket();
  const [hovered, setHovered] = useState(null);

  const eligiblePlayers = players.filter((p) => !p.isSpectator && p.isConnected);

  const submitVote = (targetId) => {
    if (myVote || isSpectator) return;
    setMyVote(targetId);
    socket.emit("submit_vote", { targetId });
  };

  const sendReaction = (emoji) => socket.emit("send_reaction", { emoji });

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      <div className="text-center mb-8 animate-fade-in">
        <div className="text-4xl mb-3">🗳️</div>
        <h2 className="text-3xl font-display font-extrabold mb-2">{t("whoIsImposter")}</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          {isSpectator ? t("spectatingVote") : myVote ? t("voteSubmitted") : t("tapToVote")}
        </p>
      </div>

      {/* Vote progress */}
      <div className="w-full px-4 py-3 rounded-xl mb-6 flex items-center justify-between"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("votesCast")}</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {eligiblePlayers.map((_, i) => (
              <div key={i} className="rounded-sm transition-all"
                style={{ width: 8, height: 16, background: i < voteCount ? "var(--accent)" : "var(--border)" }} />
            ))}
          </div>
          <span className="font-mono font-bold text-sm">{voteCount}/{eligiblePlayers.length}</span>
        </div>
      </div>

      {/* Player grid */}
      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        {eligiblePlayers.map((player) => {
          const isMe = player.id === playerId;
          const isVoted = myVote === player.id;
          return (
            <button key={player.id} onClick={() => submitVote(player.id)}
              onMouseEnter={() => setHovered(player.id)} onMouseLeave={() => setHovered(null)}
              disabled={!!myVote || isSpectator}
              className="relative flex flex-col items-center gap-3 p-5 rounded-2xl transition-all"
              style={{ background: isVoted ? "var(--accent)" : hovered === player.id && !myVote ? "var(--bg-raised)" : "var(--bg-card)",
                       border: `2px solid ${isVoted ? "var(--accent)" : hovered === player.id && !myVote ? "var(--border-bright)" : "var(--border)"}`,
                       transform: isVoted ? "scale(1.03)" : "scale(1)",
                       cursor: myVote ? "default" : "pointer",
                       opacity: myVote && !isVoted ? 0.5 : 1 }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-display font-extrabold"
                style={{ background: player.color }}>
                {player.name[0].toUpperCase()}
              </div>
              <span className="font-semibold text-sm text-center leading-tight">
                {player.name}
                {isMe && <span className="block text-xs font-normal"
                  style={{ color: isVoted ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}>
                  ({t("you")})
                </span>}
              </span>
              {isVoted && <div className="absolute top-2 right-2 text-white text-sm">✓</div>}
            </button>
          );
        })}
      </div>

      {/* Reactions */}
      <div className="w-full">
        <p className="text-xs text-center mb-3" style={{ color: "var(--text-muted)" }}>{t("react")}</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {EMOJI_OPTIONS.map((emoji) => (
            <button key={emoji} onClick={() => sendReaction(emoji)}
              className="text-xl px-2 py-1 rounded-lg transition-all hover:scale-125 active:scale-95"
              style={{ background: "var(--bg-raised)" }}>
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <FloatingReactions reactions={reactions} players={players} />
    </div>
  );
}

function FloatingReactions({ reactions, players }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {reactions.map((r) => {
        const player = players.find((p) => p.id === r.playerId);
        return (
          <div key={r.id} className="reaction-bubble absolute flex flex-col items-center gap-1"
            style={{ left: `${20 + Math.random() * 60}%`, bottom: "80px" }}>
            <span className="text-3xl">{r.emoji}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--bg-card)", color: player?.color || "var(--text-secondary)" }}>
              {r.playerName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
