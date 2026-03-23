# Design: Autosave, Voice Chat, and Guest Username Persistence

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Three independent features to improve the local and online game experience:

1. **Guest Username Persistence** — Remember a guest player's chosen name across sessions in local games.
2. **Local Game Autosave** — Automatically save local game progress so players can resume interrupted games.
3. **Voice Chat** — Always-on WebRTC audio for online multiplayer games, with mute control.

---

## Feature 1: Guest Username Persistence

### Goal
When a user is not signed in, remember the name they entered for Player 1 in local game setup so they do not need to re-type it each time.

### Storage
- Key: `ludi-guest-name` in `localStorage`
- Value: plain string, max 16 characters (matching existing name input `maxLength`)

### Changes — `packages/client/src/components/game/GameSetup.tsx`

**On mount:**
- If `user` is null (guest), read `ludi-guest-name` from `localStorage`
- Use it as the default for `playerNames[0]` instead of `'Player 1'`
- If no saved name exists, fall back to `'Player 1'` as before

**On start:**
- In `handleStart`, if `user` is null and Player 1 is configured as Human, write `playerNames[0]` to `localStorage` under `ludi-guest-name`

### Unchanged
- Signed-in users continue to use `user.displayName` as the default — no change to their flow.
- No new components or routes.

---

## Feature 2: Local Game Autosave

### Goal
Save the in-progress local game state to `localStorage` after every action so players can resume from exactly where they left off.

### Storage
- Key: `ludi-local-save` in `localStorage`
- Value: serialized `GameState` JSON

### Changes — `packages/client/src/pages/LocalGame.tsx`

**Saving:**
- After the reducer processes any of `ROLL_DICE`, `SELECT_MOVE`, or `PASS_TURN`, write the resulting `gameState` to `ludi-local-save`
- Implemented by wrapping the dispatch: call `dispatch(action)`, then in a `useEffect` keyed on `gameState`, write to storage (excluding `winner !== null` and `pageState === 'setup'` states)

**Clearing:**
- When a winner is declared (`gameState.winner !== null`), delete `ludi-local-save`
- When the user explicitly starts a new game via "Start Game" on the setup screen (not Resume), delete `ludi-local-save`

**Resuming:**
- `LocalGame` checks for `ludi-local-save` on mount and passes `hasSave` + `onResume` props down to `GameSetup`
- On resume, `LocalGame` loads the saved `GameState` via `useReducer`'s initializer, skips setup, and sets `pageState` to `'playing'`

### Changes — `packages/client/src/components/game/GameSetup.tsx`

**New props:**
```ts
hasSave?: boolean;
onResume?: () => void;
```

**UI:**
- When `hasSave` is true, show a "Resume Saved Game" button above "Start Game"
- Clicking it calls `onResume()`
- "Start Game" still works as before but clears any existing save first

---

## Feature 3: Voice Chat (Online Games)

### Goal
Allow online players to speak to each other via their device microphone. Audio is always-on once joined; players can mute/unmute themselves at any time.

### Architecture: WebRTC P2P via Socket.IO Signaling

Each player establishes a direct `RTCPeerConnection` to every other player in the room. The existing Socket.IO server relays the signaling messages (SDP offers/answers and ICE candidates) only — no audio passes through the server.

### New file — `packages/client/src/services/voiceChat.ts`

Singleton service with the following interface:

```ts
connect(localPlayerId: string, remotePlayerIds: string[], roomCode: string): Promise<void>
disconnect(): void
setMuted(muted: boolean): void
isMuted(): boolean
onParticipantCountChange(cb: (count: number) => void): void
```

Internally:
- Calls `getUserMedia({ audio: true })` on `connect`
- Creates one `RTCPeerConnection` per remote player
- Sends `voice:join` via Socket.IO to trigger offer/answer with others already in voice
- Handles `voice:offer`, `voice:answer`, `voice:ice_candidate` from socket to complete handshakes
- Attaches each remote stream to a new `Audio` element and auto-plays it
- On `disconnect`, closes all connections and stops the local stream

### New hook — `packages/client/src/hooks/useVoiceChat.ts`

```ts
useVoiceChat(roomCode: string, playerId: string, players: Player[]): {
  isMuted: boolean;
  toggleMute: () => void;
  isActive: boolean;
  participantCount: number;
}
```

- Calls `voiceChat.connect` when the game phase becomes `'playing'`
- Calls `voiceChat.disconnect` on unmount
- If `getUserMedia` is denied, sets `isActive = false` silently — no blocking error shown to user
- Listens for player join/leave events to update peer connections

### Server changes — `packages/server/src/index.ts`

Four new Socket.IO event handlers (relay only — no business logic):

| Event | Payload | Action |
|---|---|---|
| `voice:join` | `{ roomCode, playerId }` | Broadcast to room: new player ready for voice |
| `voice:offer` | `{ roomCode, targetPlayerId, sdp }` | Forward offer to `targetPlayerId` only |
| `voice:answer` | `{ roomCode, targetPlayerId, sdp }` | Forward answer to `targetPlayerId` only |
| `voice:ice_candidate` | `{ roomCode, targetPlayerId, candidate }` | Forward ICE candidate to `targetPlayerId` only |

All relay events use `socket.to(targetSocketId).emit(...)` — the server never inspects audio.

### UI changes — `packages/client/src/pages/OnlineGame.tsx` and `GameScreen.tsx`

- `useVoiceChat` is called in `OnlineGame` when `phase === 'playing'`
- A **mic toggle button** is added to the `GameScreen` action area (visible only in online mode)
  - Shows mic-on / mic-off icon
  - Shows participant count: e.g. `🎙 2/4`
- `GameScreen` receives new optional props: `voiceMuted?`, `onToggleMute?`, `voiceParticipants?`

### Permissions
- The browser mic permission prompt appears on first game join
- If denied: voice is silently unavailable; the mic button is hidden
- No persistent permission storage needed (browser handles this natively)

---

## Non-Goals
- No voice recording or playback history
- No push-to-talk mode (can be added later)
- No video
- No voice chat in local games
- No admin mute of other players

---

## File Change Summary

| File | Change |
|---|---|
| `packages/client/src/components/game/GameSetup.tsx` | Guest name persistence + `hasSave`/`onResume` props + Resume button |
| `packages/client/src/pages/LocalGame.tsx` | Autosave on dispatch, resume logic, clear on new game/win |
| `packages/client/src/services/voiceChat.ts` | New — WebRTC service |
| `packages/client/src/hooks/useVoiceChat.ts` | New — voice chat hook |
| `packages/client/src/pages/OnlineGame.tsx` | Wire up `useVoiceChat`, pass voice props to `GameScreen` |
| `packages/client/src/components/game/GameScreen.tsx` | Mic toggle button (online only) |
| `packages/server/src/index.ts` | Four new relay-only Socket.IO voice signaling handlers |
