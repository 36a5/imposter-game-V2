import { useState, useEffect } from "react";
import useGameStore from "../state/gameStore";
import { getT } from "../i18n/translations";

const REVEAL_DURATION = 5000;

export default function WordReveal() {
  const { myWord, roundNumber, totalRounds, players, isSpectator, lang, totalTurns } = useGameStore();
  const t = getT(lang);
  const isRtl = lang === "ar";
  const [timeLeft, setTimeLeft] = useState(REVEAL_DURATION);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setTimeLeft(REVEAL_DURATION);
    setHidden(false);
    const start = Date.now();
    const interval = setInterval(() => {
      const remaining = REVEAL_DURATION - (Date.now() - start);
      if (remaining <= 0) { setTimeLeft(0); setHidden(true); clearInterval(interval); }
      else setTimeLeft(remaining);
    }, 50);
    return () => clearInterval(interval);
  }, [myWord]);

  const progress = (timeLeft / REVEAL_DURATION) * 100;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 px-4 py-1 rounded-full text-sm font-mono font-bold animate-fade-in"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border-bright)", color: "var(--text-secondary)" }}>
        {t("round")} {roundNumber} / {totalRounds}
      </div>

      {isSpectator ? (
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4">👁️</div>
          <h2 className="text-2xl font-display font-bold mb-2">{t("spectatorMode")}</h2>
          <p style={{ color: "var(--text-secondary)" }}>{t("spectatorWaiting")}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-pop">
          <p className="text-sm font-semibold mb-6 tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
            {t("yourSecretWord")}
          </p>
          <div className="relative px-12 py-8 rounded-2xl mb-8 glow-accent"
            style={{ background: "var(--bg-card)", border: "2px solid var(--accent)", minWidth: "280px", textAlign: "center" }}>
            {hidden ? (
              <div className="animate-fade-in">
                <div className="text-4xl font-display font-extrabold tracking-tight blur-sm select-none"
                  style={{ color: "var(--text-primary)" }}>{myWord || "???"}</div>
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>{t("wordHiddenMsg")}</p>
              </div>
            ) : (
              <div>
                <div className="text-4xl font-display font-extrabold tracking-tight"
                  style={{ color: "var(--text-primary)" }}>{myWord || "..."}</div>
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>{t("memorizeHint")}</p>
              </div>
            )}
          </div>

          <div className="px-5 py-3 rounded-xl text-sm max-w-sm text-center mb-6"
            style={{ background: "var(--bg-raised)", color: "var(--text-secondary)" }}>
            {t("imposterHint")}
          </div>

          {!hidden && (
            <div className="w-64 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-raised)" }}>
              <div className="h-full rounded-full"
                style={{ width: `${progress}%`, background: progress > 40 ? "var(--accent)" : "var(--danger)",
                         transition: "width 0.05s linear, background 0.3s" }} />
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-2 animate-fade-in">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("drawingStartsSoon")}</p>
        <div className="flex gap-2">
          {players.filter((p) => !p.isSpectator && p.isConnected).map((p) => (
            <div key={p.id} className="player-dot" style={{ background: p.color }} title={p.name} />
          ))}
        </div>
      </div>
    </div>
  );
}
