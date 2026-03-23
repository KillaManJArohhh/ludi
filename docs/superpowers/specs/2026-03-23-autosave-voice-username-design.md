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
- In `handleStart`, if `user` is null and Player 1 is configured as Human (`aiSettings[0] === null`), write `playerNames[0]` to `localStorage` under `ludi-guest-name`

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

**Initialization (synchronous):**
- The `useReducer` initializer function reads `ludi-local-save` synchronously from `localStorage` on component mount.
- If a valid saved state is found, the reducer is initialized with it; otherwise it uses the default `createGameState(defaultConfig, createPlayers(defaultConfig))`.
- This makes the saved state available immediately and safely before any render.

**Saving:**
- A `useEffect` with dependencies `[gameState, pageState]` handles persistence.
- When `pageState === 'playing'` and `gameState.winner === null`, write `gameState` to `ludi-local-save`.
- When `gameState.winner !== null`, delete `ludi-local-save` (game complete, no longer resumable).
- When `pageState === 'setup'`, do nothing (avoid overwriting a valid save with an uninitialized state).

**Clearing on new game:**
- When the user clicks "Start Game" (not Resume) on the setup screen, `handleStart` deletes `ludi-local-save` before dispatching `RESET`. This ensures a fresh save slot for the new game.

**Resuming:**
- `LocalGame` computes `hasSave` on mount: `hasSave = localStorage.getItem('ludi-local-save') !== null`
- Passes `hasSave` and `onResume` as props to `GameSetup`
- `onResume` sets `pageState` to `'playing'` immediately (state is already loaded in the reducer initializer — no async step needed, so there is no race between clicking Resume and state availability)

### Changes — `packages/client/src/components/game/GameSetup.tsx`

**New props:**
```ts
hasSave?: boolean;
onResume?: () => void;
```

**UI:**
- When `hasSave` is true, show a "Resume Saved Game" button above "Start Game"
- Clicking it calls `onResume()`
- "Start Game" still works as before but clears `ludi-local-save` first

---

## Feature 3: Voice Chat (Online Games)

### Goal
Allow online players to speak to each other via their device microphone. Audio is always-on once joined; players can mute/unmute themselves at any time.

### Architecture: WebRTC Mesh via Socket.IO Signaling

Each player establishes a direct `RTCPeerConnection` to every other player in the room (full mesh). The existing Socket.IO server relays signaling messages only — no audio passes through the server.

### Signaling Role: Offer/Answer Responsibility

To avoid signaling collisions, a strict rule governs who sends the offer:

- **New joiner** (the player who sends `voice:join`): Sends SDP offers to **all currently connected** peers. This is determined by the server broadcasting `voice:join` to the room, and existing peers responding with answers.
- **Existing peers** (players who receive `voice:join`): Do **not** send offers. They wait for an offer from the new joiner, then respond with an answer.
- This ensures exactly one offer/answer exchange per pair, eliminating collision.

### New file — `packages/client/src/services/voiceChat.ts`

Singleton service. On first use, guards `typeof RTCPeerConnection === 'undefined'` and returns early if WebRTC is unsupported — all callers treat this as a silent no-op.

```ts
connect(localPlayerId: string, remotePlayerIds: string[], roomCode: string): Promise<void>
disconnect(): void
setMuted(muted: boolean): void
isMuted(): boolean
onParticipantCountChange(cb: (count: number) => void): void
```

**Internal `connect` flow:**
1. Guard: if `RTCPeerConnection` unavailable, return early
2. Call `getUserMedia({ audio: true })` — if denied, set `isActive = false` and return
3. Send `voice:join` via socket
4. For each `remotePlayerId` received via the broadcast (other peers already in voice), create a `RTCPeerConnection`, add the local stream, create an SDP offer, set local description, and emit `voice:offer` with `{ roomCode, targetPlayerId: remotePlayerId, sdp }`
5. On receiving `voice:offer`: create `RTCPeerConnection` for the offerer, set remote description, create answer, set local description, emit `voice:answer`
6. On receiving `voice:answer`: set remote description on the existing peer connection
7. On receiving `voice:ice_candidate`: call `addIceCandidate` on the corresponding peer connection; ignore silently if connection not found
8. On `icecandidate` event: emit `voice:ice_candidate` with `{ roomCode, targetPlayerId, candidate }`
9. On `track` event: attach stream to a new `Audio` element, call `.play()`

**Peer teardown (player disconnect):**
- When the socket emits `room:player_left` (existing event) or `voice:leave` (new event), the service closes the corresponding `RTCPeerConnection`, removes and GC's the `Audio` element, and decrements `participantCount`.

**`setMuted(true)`:** calls `track.enabled = false` on all local audio tracks. Does not affect incoming audio from peers.

### New hook — `packages/client/src/hooks/useVoiceChat.ts`

```ts
useVoiceChat(roomCode: string, playerId: string, players: Player[]): {
  isMuted: boolean;
  toggleMute: () => void;
  isActive: boolean;
  participantCount: number;
}
```

- Maps `players` to `remotePlayerIds` by filtering out the local player (`p.id !== playerId`) and extracting `p.id` (the `Player.id` field from `@ludi/shared`)
- Calls `voiceChat.connect(playerId, remotePlayerIds, roomCode)` once when mounted in the `'playing'` phase
- Calls `voiceChat.disconnect()` on unmount
- If `isActive` is false (WebRTC unavailable or mic denied), the hook still returns valid state — the UI simply hides the mic button

### Server changes — `packages/server/src/index.ts`

Four new Socket.IO event handlers. All relay handlers:
1. Verify the emitting socket is a participant in `roomCode` via the existing `getPlayerIdBySocket(room, socket.id)` check (same pattern used throughout `index.ts`). Drop the message silently if not found.
2. Look up the target's `socketId` from `playerId` using the room's player map (forward lookup: `playerId → socketId`). If the target is not found (disconnected), drop silently.
3. Forward the payload using `io.to(targetSocketId).emit(...)`.

A small helper `getSocketIdByPlayerId(room, playerId): string | null` should be added to `index.ts` (or `roomManager.ts` if a room utility module exists) to perform this forward lookup.

| Event | Payload | Action |
|---|---|---|
| `voice:join` | `{ roomCode, playerId }` | Broadcast to room (excluding sender): new player ready for voice |
| `voice:offer` | `{ roomCode, targetPlayerId, sdp }` | Forward offer to `targetPlayerId`'s socket only |
| `voice:answer` | `{ roomCode, targetPlayerId, sdp }` | Forward answer to `targetPlayerId`'s socket only |
| `voice:ice_candidate` | `{ roomCode, targetPlayerId, candidate }` | Forward ICE candidate to `targetPlayerId`'s socket only |

`voice:leave` is not needed as a separate event — peer teardown is triggered by the existing disconnect/leave flow that already fires `room:player_left` on the client.

### UI changes — `packages/client/src/pages/OnlineGame.tsx` and `GameScreen.tsx`

- `useVoiceChat` is called in `OnlineGame` when `phase === 'playing'`
- A **mic toggle button** is added to `GameScreen`'s action area (visible only when `voiceMuted !== undefined`, i.e., when voice props are provided)
  - Shows mic-on / mic-off icon
  - Shows participant count: e.g. `🎙 2/4`
- `GameScreen` receives new optional props:
  ```ts
  voiceMuted?: boolean;
  onToggleMute?: () => void;
  voiceParticipants?: number;
  ```

### Permissions
- The browser mic permission prompt appears on the first `getUserMedia` call when the game starts
- If denied: `isActive = false`; the mic button is hidden; no error is shown to the user
- If WebRTC is unavailable (`typeof RTCPeerConnection === 'undefined'`): same behaviour
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
| `packages/client/src/pages/LocalGame.tsx` | Synchronous save-state initializer, autosave effect, resume logic, clear on new game/win |
| `packages/client/src/services/voiceChat.ts` | New — WebRTC singleton service |
| `packages/client/src/hooks/useVoiceChat.ts` | New — voice chat hook |
| `packages/client/src/pages/OnlineGame.tsx` | Wire up `useVoiceChat`, pass voice props to `GameScreen` |
| `packages/client/src/components/game/GameScreen.tsx` | Optional mic toggle button (rendered only in online mode) |
| `packages/server/src/index.ts` | Four relay-only voice signaling handlers + `getSocketIdByPlayerId` helper |
