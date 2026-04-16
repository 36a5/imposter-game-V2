/**
 * translations.js
 * Gulf Arabic (خليجي) + English translations for the full UI.
 * All Arabic text is written right-to-left.
 */

export const translations = {
  en: {
    // Home
    tagline: "Draw. Deceive. Deduce.",
    yourName: "YOUR NAME",
    namePlaceholder: "Enter your display name",
    createLobby: "Create Lobby",
    joinGame: "Join Game",
    createNewLobby: "🎲 Create New Lobby",
    creating: "Creating...",
    back: "Back",
    lobbyCode: "LOBBY CODE",
    codePlaceholder: "XXXXXX",
    joinBtn: "🚀 Join Game",
    footerNote: "3–12 players · Drawing + deduction · No account needed (abdulrhman salamah all rights reserved)",

    // Lobby
    waitingRoom: "Waiting Room",
    shareCode: "Share the code to invite friends",
    copyCode: "📋 Copy Code",
    copyLink: "🔗 Copy Link",
    players: "PLAYERS",
    spectator: "spectator",
    offline: "offline",
    needMorePlayers: "Need at least 3 players to start",
    hostSettings: "HOST SETTINGS",
    rounds: "ROUNDS",
    customWordPairs: "Custom Word Pairs",
    customWordsHint: "One pair per line, separated by a comma. e.g. \"Cat, Dog\"",
    customWordsPlaceholder: "Apple, Pear\nCat, Lion\nGuitar, Violin",
    startGame: "🕵️ Start Game",
    lobbyChat: "LOBBY CHAT",
    chatPlaceholder: "Say hi while you wait!",
    chatWait: "Say hi while you wait!",
    send: "Send",
    language: "Language",

    // Word Reveal
    round: "ROUND",
    yourSecretWord: "Your secret word is",
    wordHiddenMsg: "Word hidden — drawing begins!",
    memorizeHint: "Memorize it — you won't see it again... unless it's your turn",
    imposterHint: "🕵️ One player has a different word. They don't know they're the imposter — and neither do you.",
    drawingStartsSoon: "Drawing order will begin shortly...",
    spectatorMode: "Spectator Mode",
    spectatorWaiting: "Players are reading their secret words...",

    // Drawing
    yourTurn: "Your turn!",
    isDrawing: "is drawing",
    turn: "Turn",
    of: "of",
    watching: "👀 Watching...",

    // Voting
    whoIsImposter: "Who's the Imposter?",
    spectatingVote: "Spectating the vote...",
    voteSubmitted: "Vote submitted! Waiting for others...",
    tapToVote: "Tap a player to cast your vote",
    votesCast: "Votes cast",
    you: "you",
    react: "React",

    // Results
    imposterCaught: "Imposter Caught!",
    imposterEscaped: "Imposter Escaped!",
    wasImposter: "was the imposter",
    normalWord: "Normal word",
    imposterWord: "Imposter word",
    voteBreakdown: "VOTE BREAKDOWN",
    votes: "votes",
    vote: "vote",
    imposterTag: "IMPOSTER",
    whoVotedWhom: "WHO VOTED FOR WHOM",
    votedFor: "→ voted",
    scoreboard: "SCOREBOARD",
    watchReplay: "🎬 Watch Drawing Replay",
    nextRound: "Next Round →",
    backToLobby: "🏠 Back to Lobby",
    reset: "Reset",
    waitingForHost: "Waiting for host to continue...",

    // Replay
    drawingReplay: "🎬 Drawing Replay",
    playReplay: "▶ Play Replay",
    replayAgain: "🔁 Replay Again",
    playing: "Playing...",

    // Errors
    enterName: "Enter your name first",
    invalidCode: "Enter a valid 6-character code",
    notInLobby: "Not in a lobby",
    lobbyNotFound: "Lobby not found",
    onlyHostStart: "Only the host can start",
    gameAlreadyStarted: "Game already started",
    needAtLeast3: "Need at least 3 players",
    max12: "Max 12 players",
    reconnecting: "Reconnecting...",
  },

  ar: {
    // Home
    tagline: "ارسم. اخدع. اكشف.",
    yourName: "اسمك",
    namePlaceholder: "اكتب اسمك",
    createLobby: "سوّ لوبي",
    joinGame: "انضم للعبة",
    createNewLobby: "🎲 سوّ لوبي جديد",
    creating: "يسوّي...",
    back: "ارجع",
    lobbyCode: "كود اللوبي",
    codePlaceholder: "XXXXXX",
    joinBtn: "🚀 انضم",
    footerNote: "٣–١٢ لاعب · رسم + تخمين · بدون حساب (جميع الحقوق محفوظه عبدالرحمن سلامه)",

    // Lobby
    waitingRoom: "غرفة الانتظار",
    shareCode: "شارك الكود مع أصحابك",
    copyCode: "📋 انسخ الكود",
    copyLink: "🔗 انسخ الرابط",
    players: "اللاعبين",
    spectator: "مشاهد",
    offline: "قاطع",
    needMorePlayers: "تحتاج على الأقل ٣ لاعبين للبدء",
    hostSettings: "إعدادات المضيف",
    rounds: "الجولات",
    customWordPairs: "كلمات مخصصة",
    customWordsHint: "زوج لكل سطر، مفصولين بفاصلة. مثال: \"قطة، أسد\"",
    customWordsPlaceholder: "تفاحة، كمثرى\nقطة، أسد\nجيتار، كمان",
    startGame: "🕵️ ابدأ اللعبة",
    lobbyChat: "الشات",
    chatPlaceholder: "قول شي بعد ما تنتظر!",
    chatWait: "قول شي بعد ما تنتظر!",
    send: "أرسل",
    language: "اللغة",

    // Word Reveal
    round: "الجولة",
    yourSecretWord: "كلمتك السرية هي",
    wordHiddenMsg: "الكلمة مخفية — يلا نرسم!",
    memorizeHint: "احفظها — ما راح تشوفها مرة ثانية... إلا لما يجي دورك",
    imposterHint: "🕵️ لاعب واحد عنده كلمة مختلفة. هو ما يدري إنه اللي برا السالفة — وأنت كذلك ما تدري.",
    drawingStartsSoon: "الرسم يبدأ بعد شوي...",
    spectatorMode: "وضع المشاهدة",
    spectatorWaiting: "اللاعبين يقرون كلماتهم...",

    // Drawing
    yourTurn: "دورك!",
    isDrawing: "يرسم",
    turn: "دور",
    of: "من",
    watching: "👀 تشاهد...",

    // Voting
    whoIsImposter: "من اللي برا السالفة؟",
    spectatingVote: "تشاهد التصويت...",
    voteSubmitted: "صوّتت! تنتظر الباقين...",
    tapToVote: "اضغط على لاعب عشان تصوت عليه",
    votesCast: "الأصوات",
    you: "أنت",
    react: "تفاعل",

    // Results
    imposterCaught: "انكشف اللي برا السالفة",
    imposterEscaped: "اللي برا السالفة فاز!",
    wasImposter: "كان برا السالفة",
    normalWord: "كلمة اللاعبين",
    imposterWord: "كلمة اللي برا السالفة",
    voteBreakdown: "نتيجة التصويت",
    votes: "أصوات",
    vote: "صوت",
    imposterTag: "برا السالفة",
    whoVotedWhom: "مين صوّت على مين",
    votedFor: "← صوّت على",
    scoreboard: "لوحة النتائج",
    watchReplay: "🎬 شاهد إعادة الرسم",
    nextRound: "← الجولة التالية",
    backToLobby: "🏠 ارجع للوبي",
    reset: "إعادة تشغيل",
    waitingForHost: "تنتظر المضيف...",

    // Replay
    drawingReplay: "🎬 إعادة الرسم",
    playReplay: "▶ شغّل الإعادة",
    replayAgain: "🔁 أعد مرة ثانية",
    playing: "شغال...",

    // Errors
    enterName: "اكتب اسمك أول",
    invalidCode: "اكتب كود صحيح من ٦ أحرف",
    notInLobby: "ما أنت في لوبي",
    lobbyNotFound: "اللوبي ما لقيناه",
    onlyHostStart: "بس المضيف يقدر يبدأ",
    gameAlreadyStarted: "اللعبة بدأت بالفعل",
    needAtLeast3: "تحتاج ٣ لاعبين على الأقل",
    max12: "الحد الأقصى ١٢ لاعب",
    reconnecting: "تحميل...",
  },
};

export const getT = (lang) => (key) => translations[lang]?.[key] ?? translations.en[key] ?? key;
