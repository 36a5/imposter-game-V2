import { useState, useEffect } from "react";
import useGameStore from "../state/gameStore";
import { getSocket } from "../hooks/useSocket";
import { getT } from "../i18n/translations";

export default function Home() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setPlayerName, setError, lang, setLang } = useGameStore();
  const t = getT(lang);
  const isRtl = lang === "ar";

  // Auto-fill code from URL
  useEffect(() => {
    const urlCode = window.location.pathname.match(/\/game\/([A-Z0-9]{6})/i)?.[1];
    if (urlCode) { setCode(urlCode.toUpperCase()); setMode("join"); }
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return setError(t("enterName"));
    setLoading(true);
    try {
      const res = await fetch("/api/create-lobby", { method: "POST" });
      const { lobbyCode } = await res.json();
      setPlayerName(name.trim());
      getSocket().emit("join_lobby", { lobbyCode, playerName: name.trim() });
    } catch (err) {
      // 2. Access the error message here
      setError(err.message || "Could not connect to server.");
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (!name.trim()) return setError(t("enterName"));
    if (code.trim().length !== 6) return setError(t("invalidCode"));
    setPlayerName(name.trim());
    getSocket().emit("join_lobby", { lobbyCode: code.trim().toUpperCase(), playerName: name.trim() });
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Language switcher */}
      <div className="absolute top-4 right-4 flex gap-2">
        {["en", "ar"].map((l) => (
          <button key={l} onClick={() => setLang(l)}
            className="px-3 py-1 rounded-lg text-sm font-bold transition-all"
            style={{ background: lang === l ? "var(--accent)" : "var(--bg-raised)",
                     color: lang === l ? "white" : "var(--text-secondary)",
                     border: "1px solid var(--border-bright)" }}>
            {l === "en" ? "EN" : "ع"}
          </button>
        ))}
      </div>

      {/* Hero */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="text-6xl mb-4 animate-float">🕵️</div>
        <h1 className="text-5xl md:text-6xl font-display font-extrabold mb-3 tracking-tight"
          style={{ padding:"30px",background: "linear-gradient(135deg, #f0f0ff 30%, #7c5cfc 100%)",
                   WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {isRtl ? "مين اللي برا السالفة؟" : "Who Is The\nImposter?"}
        </h1>
        <p className="text-lg" style={{ color: "var(--text-secondary)" }}>{t("tagline")}</p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-md p-8 animate-slide-up">
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
            {t("yourName")}
          </label>
          <input className="input" placeholder={t("namePlaceholder")} value={name}
            onChange={(e) => setName(e.target.value)} maxLength={20}
            onKeyDown={(e) => e.key === "Enter" && (mode === "join" ? handleJoin() : handleCreate())}
            style={{ textAlign: isRtl ? "right" : "left" }} />
        </div>

        {!mode && (
          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={() => setMode("create")}>{t("createLobby")}</button>
            <button className="btn-secondary flex-1" onClick={() => setMode("join")}>{t("joinGame")}</button>
          </div>
        )}

        {mode === "create" && (
          <div className="animate-fade-in">
            <button className="btn-primary w-full mb-3" onClick={handleCreate} disabled={loading}>
              {loading ? t("creating") : t("createNewLobby")}
            </button>
            <button className="btn-secondary w-full" onClick={() => setMode(null)}>{t("back")}</button>
          </div>
        )}

        {mode === "join" && (
          <div className="animate-fade-in">
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("lobbyCode")}
              </label>
              <input className="input text-center text-2xl tracking-widest font-mono font-bold uppercase"
                placeholder={t("codePlaceholder")} value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} maxLength={6}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()} />
            </div>
            <button className="btn-primary w-full mb-3" onClick={handleJoin}>{t("joinBtn")}</button>
            <button className="btn-secondary w-full" onClick={() => setMode(null)}>{t("back")}</button>
          </div>
        )}
      </div>

      <p className="mt-8 text-sm" style={{ color: "var(--text-muted)" }}>{t("footerNote")}</p>
    </div>
  );
}
