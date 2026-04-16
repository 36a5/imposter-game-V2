import { useState } from "react";
import useGameStore from "../state/gameStore";
import { getSocket } from "../hooks/useSocket";
import { getT } from "../i18n/translations";

export default function Lobby() {
  const { players, hostId, playerId, lobbyCode, isHost, totalRounds, chatMessages, lang } = useGameStore();
  const t = getT(lang);
  const isRtl = lang === "ar";
  const [customWords, setCustomWords] = useState("");
  const [showCustomWords, setShowCustomWords] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const socket = getSocket();

  const copyCode = () => navigator.clipboard.writeText(lobbyCode);
  const copyLink = () => navigator.clipboard.writeText(`${window.location.origin}/game/${lobbyCode}`);

  const startGame = () => {
    const pairs = parseCustomWords(customWords);
    socket.emit("start_game", { totalRounds, lang, customWordPairs: pairs.length > 0 ? pairs : undefined });
  };

  const setRounds = (n) => socket.emit("set_round_count", { count: n });
  const sendChat = () => {
    if (!chatInput.trim()) return;
    socket.emit("send_chat", { message: chatInput.trim() });
    setChatInput("");
  };

  const activePlayers = players.filter((p) => !p.isSpectator);
  const canStart = isHost && activePlayers.length >= 3;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold">{t("waitingRoom")}</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("shareCode")}</p>
        </div>
        <div className="font-mono font-bold text-2xl tracking-widest px-4 py-2 rounded-xl cursor-pointer"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border-bright)", color: "var(--accent)" }}
          onClick={copyCode} title="Click to copy">
          {lobbyCode}
        </div>
      </div>

      {/* Share */}
      <div className="w-full flex gap-2 mb-6">
        <button className="btn-secondary flex-1 text-sm py-2" onClick={copyCode}>{t("copyCode")}</button>
        <button className="btn-secondary flex-1 text-sm py-2" onClick={copyLink}>{t("copyLink")}</button>
      </div>

      {/* Players */}
      <div className="card w-full p-4 mb-4">
        <h3 className="font-display font-semibold mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("players")} ({activePlayers.length}/12)
        </h3>
        <div className="flex flex-col gap-2">
          {players.map((player) => (
            <div key={player.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: "var(--bg-raised)" }}>
              <div className="player-dot" style={{ background: player.color }} />
              <span className="font-medium flex-1">{player.name}</span>
              <div className="flex gap-2 items-center">
                {player.isSpectator && (
                  <span className="text-xs px-2 py-1 rounded" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
                    {t("spectator")}
                  </span>
                )}
                {player.id === hostId && <span className="text-xs">👑</span>}
                {!player.isConnected && <span className="text-xs" style={{ color: "var(--danger)" }}>{t("offline")}</span>}
              </div>
            </div>
          ))}
        </div>
        {activePlayers.length < 3 && (
          <p className="text-sm mt-3 text-center" style={{ color: "var(--text-muted)" }}>{t("needMorePlayers")}</p>
        )}
      </div>

      {/* Host controls */}
      {isHost && (
        <div className="card w-full p-4 mb-4">
          <h3 className="font-display font-semibold mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("hostSettings")}
          </h3>

          {/* Language */}
          <div className="mb-4">
            <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("language")}</label>
            <div className="flex gap-2">
              {[["en","English"],["ar","العربي"]].map(([l, label]) => (
                <button key={l} onClick={() => socket.emit("set_lang", { lang: l })}
                  className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{ background: lang === l ? "var(--accent)" : "var(--bg-raised)",
                           border: `1px solid ${lang === l ? "var(--accent)" : "var(--border-bright)"}`,
                           color: lang === l ? "white" : "var(--text-secondary)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Rounds */}
          <div className="mb-4">
            <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("rounds")}</label>
            <div className="flex gap-2">
              {[1,2,3,5].map((n) => (
                <button key={n} className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{ background: totalRounds === n ? "var(--accent)" : "var(--bg-raised)",
                           border: `1px solid ${totalRounds === n ? "var(--accent)" : "var(--border-bright)"}`,
                           color: totalRounds === n ? "white" : "var(--text-secondary)" }}
                  onClick={() => setRounds(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Custom words */}
          <div className="mb-4">
            <button className="text-sm font-semibold" style={{ color: "var(--accent)" }}
              onClick={() => setShowCustomWords((v) => !v)}>
              {showCustomWords ? "▾" : "▸"} {t("customWordPairs")} {customWords ? "✓" : ""}
            </button>
            {showCustomWords && (
              <div className="mt-3 animate-fade-in">
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{t("customWordsHint")}</p>
                <textarea className="input text-sm" rows={4}
                  placeholder={t("customWordsPlaceholder")} value={customWords}
                  onChange={(e) => setCustomWords(e.target.value)}
                  style={{ textAlign: isRtl ? "right" : "left" }} />
              </div>
            )}
          </div>

          <button className="btn-primary w-full text-lg" onClick={startGame}
            disabled={!canStart} style={{ opacity: canStart ? 1 : 0.4 }}>
            {t("startGame")}
          </button>
        </div>
      )}

      {/* Chat */}
      <div className="card w-full p-4">
        <h3 className="font-display font-semibold mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("lobbyChat")}
        </h3>
        <div className="flex flex-col gap-2 mb-3 overflow-y-auto" style={{ maxHeight: "160px" }}>
          {chatMessages.length === 0 && (
            <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{t("chatWait")}</p>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="player-dot mt-1 flex-shrink-0" style={{ background: msg.color }} />
              <p className="text-sm" style={{ textAlign: isRtl ? "right" : "left" }}>
                <span className="font-semibold">{msg.playerName}: </span>
                <span style={{ color: "var(--text-secondary)" }}>{msg.message}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="input text-sm flex-1" placeholder={t("chatPlaceholder")}
            value={chatInput} onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()} maxLength={200}
            style={{ textAlign: isRtl ? "right" : "left" }} />
          <button className="btn-primary py-2 px-4 text-sm" onClick={sendChat}>{t("send")}</button>
        </div>
      </div>
    </div>
  );
}

function parseCustomWords(text) {
  return text.split("\n").map((line) => line.split(",").map((w) => w.trim()).filter(Boolean))
    .filter((pair) => pair.length === 2);
}
