# 🕵️ Who Is The Imposter?

A real-time multiplayer social deduction + drawing game. Players take turns drawing a shared secret word — but one player (the imposter) has a *different* word and doesn't know they're the imposter. After drawing, everyone votes. Can you spot who's off?

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
# 1. Install root dev tools
npm install

# 2. Install server + client dependencies
npm run install:all

# 3. Run both in parallel (requires concurrently)
npm run dev
```

Or run them separately:

```bash
# Terminal 1 — Server (port 3001)
cd server && node index.js

# Terminal 2 — Client (port 5173)
cd client && npx vite
```

Open **http://localhost:5173** in your browser.

---

## How to Play

1. **Create a lobby** — you become the host
2. **Share the 6-character code** or link with friends (3–12 players)
3. **Host starts the game** — optionally set round count and custom word pairs
4. **Word Reveal** — each player privately sees their secret word for 5 seconds
   - Normal players all get the same word (e.g. "Cat")
   - The imposter gets a similar but different word (e.g. "Lion")
   - Nobody knows who the imposter is — not even the imposter
5. **Drawing Phase** — players take turns drawing on a shared canvas (3 seconds each)
   - Active player sees their word as a reminder while drawing
   - All other players watch in real-time
6. **Voting** — tap a player to vote for who you think the imposter is
   - React with emoji while voting
7. **Results** — dramatic reveal with vote breakdown, scores, and a full drawing replay

---

## Features

- ✅ Real-time multiplayer via Socket.io
- ✅ Vector path canvas sync (60fps drawing)
- ✅ 3–12 players per lobby
- ✅ Spectator mode for late joiners
- ✅ Multiple rounds with score tracking
- ✅ Custom word pairs (host can set these before game)
- ✅ Emoji reactions during voting
- ✅ Lobby chat
- ✅ Full drawing replay on results screen (stroke-by-stroke, with each player's word revealed)
- ✅ Graceful disconnect handling (skip disconnected players' turns)
- ✅ Host migration if host disconnects

---

## Architecture

```
imposter-game/
├── server/
│   ├── index.js          # Express + Socket.io server
│   ├── gameRoom.js       # GameRoom class + FSM
│   └── wordPairs.js      # Word pair list + picker
└── client/
    └── src/
        ├── main.jsx
        ├── App.jsx                    # Phase router
        ├── state/
        │   └── gameStore.js           # Zustand store
        ├── hooks/
        │   ├── useSocket.js           # Socket.io connection + event routing
        │   └── useCanvas.js           # Vector drawing + replay
        └── components/
            ├── Home.jsx               # Create / join lobby
            ├── Lobby.jsx              # Waiting room + host controls
            ├── WordReveal.jsx         # Secret word display
            ├── DrawingCanvas.jsx      # Drawing phase UI
            ├── VotingScreen.jsx       # Vote + emoji reactions
            └── ResultsScreen.jsx      # Reveal + replay viewer
```

### State Machine

```
LOBBY → WORD_REVEAL → DRAWING → VOTING → RESULTS → LOBBY
```

Transitions are server-authoritative. The client only renders what the server tells it.

### Security Model

- **Roles are server-side only** — `roles` Map in `GameRoom` is never broadcast
- Each player receives only **their own word** via a private `emitTo()` call
- The imposter is not told they are the imposter
- Votes are hidden until all are cast (only the count is broadcast)
- Full reveal happens only in the `RESULTS` phase, server-triggered

### Canvas Sync (Vector Paths)

```
pointerdown → begin path, start emit timer (16ms interval)
pointermove → buffer points, draw locally for instant feedback
             → emit batched points as { pathId, points[], color, lineWidth }
pointerup   → flush buffer, emit drawing_end
             → server saves stroke to strokeHistory[]

All clients receive stroke_update → draw onto canvas
strokeHistory → used for replay in ResultsScreen
```

---

## Scoring

| Event | Points |
|---|---|
| Normal player votes correctly for imposter | +2 |
| Imposter escapes (not caught by majority) | +3 |
| Imposter caught but by only 1 vote margin | +1 |

Scores accumulate across rounds within a session.

---

## Word Pairs

Default pairs live in `server/wordPairs.js`. To add more:

```js
// Just add to the DEFAULT_WORD_PAIRS array:
["Sofa", "Couch"],
["Shark", "Dolphin"],
```

Rules for good pairs:
- Similar enough that the imposter can draw *something* plausible
- Different enough that a sharp observer might notice the mismatch
- Avoid near-synonyms (too easy for imposter) and totally unrelated words (too obvious)

Hosts can also supply custom word pairs in the lobby UI before starting.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `VITE_SERVER_URL` | `http://localhost:3001` | Client → server URL |

For production, set `VITE_SERVER_URL` to your deployed server URL and build the client:

```bash
cd client && VITE_SERVER_URL=https://your-server.com npx vite build
```

---

## Extending the Game

### Add a new game phase
1. Add the phase name to `PHASES` in `gameRoom.js`
2. Add the FSM transition method
3. Add a new component in `client/src/components/`
4. Add the phase → component mapping in `App.jsx`

### Add a new Socket.io event
1. Add server handler in `server/index.js` (under `io.on("connection", ...)`)
2. Add game logic in `gameRoom.js`
3. Add client listener in `useSocket.js`
4. Update `gameStore.js` if state needs to change

### Add spectator chat / reactions
The spectator infrastructure is already in place. To enable chat during drawing:
- Remove the `if (this.phase !== PHASES.LOBBY) return;` guard in `gameRoom.sendChat()`
- Add a chat UI overlay to `DrawingCanvas.jsx`
