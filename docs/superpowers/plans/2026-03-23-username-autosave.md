# Username Persistence + Local Game Autosave Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist a guest player's chosen name across sessions and autosave local game progress so games can be resumed after navigating away.

**Architecture:** Both features use `localStorage` only — no server changes. Guest name is stored under `ludi-guest-name` and read/written in `GameSetup.tsx`. Game state is stored under `ludi-local-save`, written in a `useEffect` in `LocalGame.tsx`, and loaded synchronously via the `useReducer` initializer.

**Tech Stack:** React 19, TypeScript, localStorage

---

## Chunk 1: Guest Username Persistence

### Task 1: Persist guest player name in GameSetup

**Files:**
- Modify: `packages/client/src/components/game/GameSetup.tsx`

**Context:** `GameSetup.tsx` initialises `playerNames` state on line 19. It currently uses `user?.displayName || 'Player 1'` for slot 0. We need to also check `localStorage.getItem('ludi-guest-name')` when `user` is null.

- [ ] **Step 1: Read the current playerNames initialisation in GameSetup.tsx**

Open `packages/client/src/components/game/GameSetup.tsx` and locate line 19:
```ts
const [playerNames, setPlayerNames] = useState([user?.displayName || 'Player 1', 'Player 2', 'Player 3', 'Player 4']);
```

- [ ] **Step 2: Add a helper to read the guest name from localStorage**

At the top of the component function (before the `useState` calls), add:
```ts
const savedGuestName = !user ? (localStorage.getItem('ludi-guest-name') || 'Player 1') : null;
```

- [ ] **Step 3: Use savedGuestName in the playerNames initialiser**

Replace line 19 with:
```ts
const [playerNames, setPlayerNames] = useState([
  user?.displayName || savedGuestName || 'Player 1',
  'Player 2', 'Player 3', 'Player 4',
]);
```

- [ ] **Step 4: Save the guest name when the game starts**

In `handleStart` (just before calling `onStart`), add:
```ts
if (!user && aiSettings[0] === null && playerNames[0].trim()) {
  localStorage.setItem('ludi-guest-name', playerNames[0].trim());
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run from the repo root:
```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Manual verify**

1. Open the local game setup page while not signed in.
2. Change Player 1's name to "TestGuest" and click Start Game.
3. Navigate home, then back to local game setup.
4. Confirm Player 1's name field shows "TestGuest".

- [ ] **Step 7: Commit**

```bash
git add packages/client/src/components/game/GameSetup.tsx
git commit -m "feat: persist guest player name across sessions"
```

---

## Chunk 2: Local Game Autosave

### Task 2: Load saved game state synchronously in LocalGame

**Files:**
- Modify: `packages/client/src/pages/LocalGame.tsx`

**Context:** `LocalGame.tsx` currently initialises the reducer on line 24-27 with a hardcoded default state. We need the initializer to read `ludi-local-save` from localStorage synchronously so the saved game is available before the first render.

- [ ] **Step 1: Add GameState to the import and add the save key constant and initializer function**

First, update line 3 of `LocalGame.tsx` to add `GameState` to the import:
```ts
import type { GameConfig, Player, MoveOption, PlayerStats, GameState } from '@ludi/shared';
```

Then, after the existing `STATS_KEY` constant on line 8, add:
```ts
const SAVE_KEY = 'ludi-local-save';

function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    // Basic sanity check — must have players and pieces
    if (!state.players || !state.pieces) return null;
    return state;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Wire the initializer into useReducer**

`useReducer` supports a third argument: `(initialArg, init) => state`. Replace lines 24-27:

```ts
// Before:
const [gameState, dispatch] = useReducer(
  gameReducer,
  createGameState(defaultConfig, createPlayers(defaultConfig))
);

// After:
const [gameState, dispatch] = useReducer(
  gameReducer,
  defaultConfig,
  (cfg) => loadSavedGame() ?? createGameState(cfg, createPlayers(cfg))
);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/pages/LocalGame.tsx
git commit -m "feat: load saved game state synchronously on mount"
```

---

### Task 3: Autosave game state on every action

**Files:**
- Modify: `packages/client/src/pages/LocalGame.tsx`

**Context:** We need a `useEffect` that writes `gameState` to `ludi-local-save` whenever the game is in progress, and clears it when a winner is declared.

- [ ] **Step 1: Add the autosave effect**

After the existing `savedRef` / stats `useEffect` block (around line 47-83 in the original file), add:

```ts
// Autosave: write game state to localStorage whenever playing
useEffect(() => {
  if (pageState !== 'playing') return;
  if (gameState.winner !== null) {
    localStorage.removeItem(SAVE_KEY);
    return;
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
  } catch {
    // Silently ignore storage quota errors
  }
}, [gameState, pageState]);
```

- [ ] **Step 2: Clear the save when starting a new game**

In `handleStart` (the callback defined with `useCallback`), add a `localStorage.removeItem(SAVE_KEY)` call before `dispatch`:

```ts
const handleStart = useCallback((config: GameConfig, players: Player[]) => {
  localStorage.removeItem(SAVE_KEY);   // ← add this line
  dispatch({ type: 'RESET', config, players });
  setPageState('playing');
}, []);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Manual verify — save is written**

1. Start a local game, take a turn (roll dice, move a piece).
2. Open browser DevTools → Application → Local Storage.
3. Confirm `ludi-local-save` key exists with JSON game state.

- [ ] **Step 5: Manual verify — save is cleared on win**

1. (If possible) use browser DevTools to set `gameState.winner` or play to completion.
2. Confirm `ludi-local-save` is removed from localStorage.

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/pages/LocalGame.tsx
git commit -m "feat: autosave local game state on every action"
```

---

### Task 4: Add Resume Saved Game button to GameSetup

**Files:**
- Modify: `packages/client/src/components/game/GameSetup.tsx`
- Modify: `packages/client/src/pages/LocalGame.tsx`

**Context:** `GameSetup` needs two new optional props (`hasSave`, `onResume`). `LocalGame` detects a saved game on mount and passes these props down. A "Resume Saved Game" button appears above "Start Game" when a save exists.

- [ ] **Step 1: Add hasSave and onResume props to GameSetup**

In `GameSetup.tsx`, update the `GameSetupProps` interface:
```ts
interface GameSetupProps {
  onStart: (config: GameConfig, players: Player[]) => void;
  onBack: () => void;
  hasSave?: boolean;
  onResume?: () => void;
}
```

And update the destructured props in the function signature:
```ts
export default function GameSetup({ onStart, onBack, hasSave, onResume }: GameSetupProps) {
```

- [ ] **Step 2: Add the Resume button to GameSetup UI**

In the action buttons section at the bottom of `GameSetup.tsx` (the `<div className="flex gap-3">` containing Back and Start Game), add the Resume button **above** the flex row:

```tsx
{hasSave && onResume && (
  <button
    onClick={onResume}
    className="w-full py-3 mb-3 rounded-lg font-bold tracking-wide
               bg-[#C4A35A]/20 text-[#FED100] border border-[#C4A35A]/40
               hover:bg-[#C4A35A]/30 transition-all"
  >
    Resume Saved Game
  </button>
)}
```

- [ ] **Step 3: Wire hasSave and onResume in LocalGame**

In `LocalGame.tsx`, add state to track whether a save exists, and a handler to resume:

```ts
const [hasSave, setHasSave] = useState(() => localStorage.getItem(SAVE_KEY) !== null);

const handleResume = useCallback(() => {
  setPageState('playing');
}, []);
```

Then update the `GameSetup` render to pass the new props:
```tsx
return <GameSetup
  onStart={handleStart}
  onBack={() => navigate('/')}
  hasSave={hasSave}
  onResume={handleResume}
/>;
```

Also clear `hasSave` when starting a new game. This replaces the version of `handleStart` written in Task 3, Step 2 — add `setHasSave(false)` to it:
```ts
const handleStart = useCallback((config: GameConfig, players: Player[]) => {
  localStorage.removeItem(SAVE_KEY);
  setHasSave(false);           // ← add this line (replaces Task 3 version)
  dispatch({ type: 'RESET', config, players });
  setPageState('playing');
}, []);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Full manual flow verify**

1. Start a local game, take a turn.
2. Navigate home (back button or logo).
3. Go back to Local Game.
4. Confirm "Resume Saved Game" button appears above "Start Game".
5. Click "Resume Saved Game" — confirm the game resumes from the saved state (pieces in correct positions, same player's turn).
6. Win the game (or set winner via DevTools).
7. Go home and back to Local Game.
8. Confirm "Resume Saved Game" button is **gone**.

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/components/game/GameSetup.tsx packages/client/src/pages/LocalGame.tsx
git commit -m "feat: add Resume Saved Game button to local game setup"
```
