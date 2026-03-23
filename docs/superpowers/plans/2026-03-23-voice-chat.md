# Voice Chat (WebRTC) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add always-on WebRTC voice chat for online multiplayer games with a mute/unmute toggle button.

**Architecture:** Full WebRTC mesh topology. The existing Socket.IO server acts as a signaling relay only (no audio passes through it). A new `voiceChat.ts` singleton service manages all `RTCPeerConnection` instances. A `useVoiceChat` hook wraps it for React. **Offer/answer rule:** when a new player joins, the server broadcasts `voice:peer_joined` to all existing peers; each existing peer sends the new joiner an SDP offer; the new joiner responds with an answer to each. This ensures exactly one offer/answer exchange per pair with no collisions. (Note: the spec describes the inverse — new joiner sends offers — but that requires the joiner to know the list of existing peers up-front, adding server complexity. The existing-peers-offer approach is simpler and equally collision-free.)

**Tech Stack:** WebRTC (browser native), Socket.IO (existing), React hooks, TypeScript

---

## Chunk 1: Server-side signaling relay

### Task 1: Add voice signaling relay handlers to the server

**Files:**
- Modify: `packages/server/src/index.ts`

**Context:** The server needs four new Socket.IO event handlers that relay WebRTC signaling between players. All handlers follow the same security pattern already used throughout `index.ts`: verify the sender is a room participant via `getPlayerIdBySocket`, then look up the target's `socketId` and forward. A `getSocketIdByPlayerId` helper (direct O(1) map lookup — the `Room.players` map is keyed by `playerId`) is needed alongside the existing reverse-lookup `getPlayerIdBySocket`.

**Important placement:** All new handlers must go **before** the `socket.on('disconnect', ...)` handler (currently at line 175). Inserting after the disconnect handler would place them outside the `io.on('connection')` block and they would never fire.

- [ ] **Step 1: Add getSocketIdByPlayerId helper**

In `packages/server/src/index.ts`, after the existing `getPlayerIdBySocket` function (lines 40-46), add:

```ts
/** Direct lookup: find socketId for a given playerId in a room */
function getSocketIdByPlayerId(room: ReturnType<typeof getRoom>, playerId: string): string | null {
  if (!room) return null;
  const entry = room.players.get(playerId);
  return entry?.socketId ?? null;
}
```

- [ ] **Step 2: Add the four voice relay handlers inside io.on('connection')**

Inside `io.on('connection', (socket) => { ... })`, insert the following block **before** the `socket.on('disconnect', ...)` handler at line 175:

```ts
// --- Voice signaling relay (WebRTC) ---
// Note: voice:join payload contains roomCode only; sender identity is derived server-side
// from the socket via getPlayerIdBySocket (same pattern as all other handlers).

socket.on('voice:join', ({ roomCode }: { roomCode: string }) => {
  if (!isValidRoomCode(roomCode)) return;
  const room = getRoom(roomCode);
  if (!room) return;
  const senderId = getPlayerIdBySocket(room, socket.id);
  if (!senderId) return; // not a room participant — drop
  // Broadcast to all other players so they can each send an offer to the new joiner
  socket.to(roomCode).emit('voice:peer_joined', { playerId: senderId });
});

socket.on('voice:offer', ({ roomCode, targetPlayerId, sdp }: {
  roomCode: string;
  targetPlayerId: string;
  sdp: RTCSessionDescriptionInit;
}) => {
  if (!isValidRoomCode(roomCode)) return;
  const room = getRoom(roomCode);
  if (!room) return;
  const senderId = getPlayerIdBySocket(room, socket.id);
  if (!senderId) return;
  const targetSocketId = getSocketIdByPlayerId(room, targetPlayerId);
  if (!targetSocketId) return; // target disconnected — drop silently
  io.to(targetSocketId).emit('voice:offer', { fromPlayerId: senderId, sdp });
});

socket.on('voice:answer', ({ roomCode, targetPlayerId, sdp }: {
  roomCode: string;
  targetPlayerId: string;
  sdp: RTCSessionDescriptionInit;
}) => {
  if (!isValidRoomCode(roomCode)) return;
  const room = getRoom(roomCode);
  if (!room) return;
  const senderId = getPlayerIdBySocket(room, socket.id);
  if (!senderId) return;
  const targetSocketId = getSocketIdByPlayerId(room, targetPlayerId);
  if (!targetSocketId) return;
  io.to(targetSocketId).emit('voice:answer', { fromPlayerId: senderId, sdp });
});

socket.on('voice:ice_candidate', ({ roomCode, targetPlayerId, candidate }: {
  roomCode: string;
  targetPlayerId: string;
  candidate: RTCIceCandidateInit;
}) => {
  if (!isValidRoomCode(roomCode)) return;
  const room = getRoom(roomCode);
  if (!room) return;
  const senderId = getPlayerIdBySocket(room, socket.id);
  if (!senderId) return;
  const targetSocketId = getSocketIdByPlayerId(room, targetPlayerId);
  if (!targetSocketId) return;
  io.to(targetSocketId).emit('voice:ice_candidate', { fromPlayerId: senderId, candidate });
});
```

- [ ] **Step 3: Verify server TypeScript compiles**

```bash
cd packages/server && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/index.ts
git commit -m "feat: add WebRTC voice signaling relay to server"
```

---

## Chunk 2: Client voice chat service

### Task 2: Create the voiceChat singleton service

**Files:**
- Create: `packages/client/src/services/voiceChat.ts`

**Context:** Offer/answer flow:
- **Existing peers** receive `voice:peer_joined` when a new player joins. They each create a `RTCPeerConnection`, add their local stream, create an SDP offer, and send it to the new joiner via `voice:offer`.
- **New joiner** receives `voice:offer` from each existing peer, creates a `RTCPeerConnection`, sets the remote description, creates an answer, and responds via `voice:answer`.
- ICE candidates are exchanged via `voice:ice_candidate` by both sides after local description is set.
- On `room:player_left` (existing server event), the corresponding peer connection is closed and its audio element removed.

- [ ] **Step 1: Create the service file**

Create `packages/client/src/services/voiceChat.ts`:

```ts
import { getSocket } from './socketService.js';

interface PeerEntry {
  connection: RTCPeerConnection;
  audioEl: HTMLAudioElement;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let localStream: MediaStream | null = null;
let localPlayerId = '';
let currentRoomCode = '';
let muted = false;
let _active = false;
const peers = new Map<string, PeerEntry>();
let participantCountCb: ((n: number) => void) | null = null;

function notifyCount() {
  participantCountCb?.(peers.size);
}

function createPeerConnection(remotePlayerId: string): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  // Add local audio tracks to the connection
  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  // Forward ICE candidates to the remote peer
  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    const socket = getSocket();
    socket.emit('voice:ice_candidate', {
      roomCode: currentRoomCode,
      targetPlayerId: remotePlayerId,
      candidate: e.candidate.toJSON(),
    });
  };

  // Play incoming audio via a hidden <audio> element
  const audioEl = document.createElement('audio');
  audioEl.autoplay = true;
  document.body.appendChild(audioEl);

  pc.ontrack = (e) => {
    audioEl.srcObject = e.streams[0];
  };

  peers.set(remotePlayerId, { connection: pc, audioEl });
  notifyCount();
  return pc;
}

function closePeer(remotePlayerId: string) {
  const entry = peers.get(remotePlayerId);
  if (!entry) return;
  entry.connection.close();
  entry.audioEl.srcObject = null;
  entry.audioEl.remove();
  peers.delete(remotePlayerId);
  notifyCount();
}

function setupSocketListeners() {
  const socket = getSocket();

  // Existing peer: a new player joined voice — we send them an offer so they can answer
  socket.on('voice:peer_joined', async ({ playerId }: { playerId: string }) => {
    if (!_active || playerId === localPlayerId) return;
    const pc = createPeerConnection(playerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('voice:offer', {
      roomCode: currentRoomCode,
      targetPlayerId: playerId,
      sdp: pc.localDescription,
    });
  });

  // New joiner: received an offer from an existing peer — respond with an answer
  socket.on('voice:offer', async ({ fromPlayerId, sdp }: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => {
    if (!_active) return;
    const pc = createPeerConnection(fromPlayerId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('voice:answer', {
      roomCode: currentRoomCode,
      targetPlayerId: fromPlayerId,
      sdp: pc.localDescription,
    });
  });

  // Both sides: received an answer to our offer
  socket.on('voice:answer', async ({ fromPlayerId, sdp }: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => {
    const entry = peers.get(fromPlayerId);
    if (!entry) return;
    await entry.connection.setRemoteDescription(new RTCSessionDescription(sdp));
  });

  // Both sides: ICE candidate from a peer
  socket.on('voice:ice_candidate', async ({ fromPlayerId, candidate }: { fromPlayerId: string; candidate: RTCIceCandidateInit }) => {
    const entry = peers.get(fromPlayerId);
    if (!entry) return;
    try {
      await entry.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore stale candidates
    }
  });

  // Peer teardown: a player left the game — close their connection and remove audio
  socket.on('room:player_left', ({ playerId }: { playerId: string }) => {
    closePeer(playerId);
  });
}

function teardownSocketListeners() {
  const socket = getSocket();
  socket.off('voice:peer_joined');
  socket.off('voice:offer');
  socket.off('voice:answer');
  socket.off('voice:ice_candidate');
  socket.off('room:player_left');
}

export const voiceChat = {
  async connect(playerId: string, _remotePlayerIds: string[], roomCode: string): Promise<void> {
    // Guard: WebRTC not supported in this environment
    if (typeof RTCPeerConnection === 'undefined') return;

    localPlayerId = playerId;
    currentRoomCode = roomCode;

    // Request mic access — if denied, voice chat is silently disabled
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      return;
    }

    _active = true;

    // Apply current mute state to the new stream
    for (const track of localStream.getAudioTracks()) {
      track.enabled = !muted;
    }

    setupSocketListeners();

    // Notify server — existing peers will each receive voice:peer_joined and send us an offer
    const socket = getSocket();
    socket.emit('voice:join', { roomCode });
  },

  disconnect(): void {
    _active = false;
    teardownSocketListeners();
    for (const id of Array.from(peers.keys())) {
      closePeer(id);
    }
    if (localStream) {
      for (const track of localStream.getTracks()) track.stop();
      localStream = null;
    }
    localPlayerId = '';
    currentRoomCode = '';
    notifyCount();
  },

  setMuted(value: boolean): void {
    muted = value;
    if (localStream) {
      for (const track of localStream.getAudioTracks()) {
        track.enabled = !value;
      }
    }
  },

  isMuted(): boolean { return muted; },
  isActive(): boolean { return _active; },

  onParticipantCountChange(cb: (n: number) => void): void {
    participantCountCb = cb;
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/services/voiceChat.ts
git commit -m "feat: add WebRTC voice chat service"
```

---

### Task 3: Create the useVoiceChat hook

**Files:**
- Create: `packages/client/src/hooks/useVoiceChat.ts`

**Context:** Wraps `voiceChat.ts` for React. Connects once on mount, disconnects on unmount. Guards against setting state on an unmounted component after the async `connect` resolves.

- [ ] **Step 1: Create the hook file**

Create `packages/client/src/hooks/useVoiceChat.ts`:

```ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Player } from '@ludi/shared';
import { voiceChat } from '../services/voiceChat.js';

export function useVoiceChat(roomCode: string, playerId: string, players: Player[]) {
  const [isMuted, setIsMuted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const remotePlayerIds = players
      .filter(p => p.id !== playerId)
      .map(p => p.id);

    voiceChat.onParticipantCountChange((count) => {
      if (mountedRef.current) setParticipantCount(count);
    });

    voiceChat.connect(playerId, remotePlayerIds, roomCode).then(() => {
      if (mountedRef.current) setIsActive(voiceChat.isActive());
    });

    return () => {
      mountedRef.current = false;
      voiceChat.disconnect();
      setIsActive(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — roomCode/playerId/players are stable at game start

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      voiceChat.setMuted(next);
      return next;
    });
  }, []);

  return { isMuted, toggleMute, isActive, participantCount };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/hooks/useVoiceChat.ts
git commit -m "feat: add useVoiceChat hook"
```

---

## Chunk 3: UI integration

### Task 4: Add voice props to GameScreen

**Files:**
- Modify: `packages/client/src/components/game/GameScreen.tsx`

**Context:** Add three optional props. The mic button only renders when `onToggleMute` is provided (online games only). When `isActive` is false (mic denied or WebRTC unavailable), `onToggleMute` will be `undefined` so the button is hidden automatically.

- [ ] **Step 1: Add voice props to GameScreenProps interface**

In `packages/client/src/components/game/GameScreen.tsx`, update the `GameScreenProps` interface (around line 23):

```ts
interface GameScreenProps {
  state: GameState;
  onRoll: () => void;
  onSelectMove: (option: MoveOption) => void;
  onPass: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
  localPlayerId?: string;
  onRematch?: () => void;
  eloChange?: number | null;
  isSpectator?: boolean;
  // Voice chat (online only — omit to hide the mic button)
  voiceMuted?: boolean;
  onToggleMute?: () => void;
  voiceParticipants?: number;
}
```

- [ ] **Step 2: Destructure the new props**

Update the function signature to include:
```ts
export default function GameScreen({
  state,
  onRoll,
  onSelectMove,
  onPass,
  onPlayAgain,
  onHome,
  localPlayerId,
  onRematch,
  eloChange,
  isSpectator,
  voiceMuted,
  onToggleMute,
  voiceParticipants,
}: GameScreenProps) {
```

- [ ] **Step 3: Find where SoundToggle is rendered**

Search `GameScreen.tsx` for `<SoundToggle` — note its exact location in the JSX.

- [ ] **Step 4: Add the mic toggle button next to SoundToggle**

Wrap `<SoundToggle />` and the mic button together:

```tsx
<div className="flex items-center gap-2">
  <SoundToggle />
  {onToggleMute && (
    <button
      onClick={onToggleMute}
      title={voiceMuted ? 'Unmute microphone' : 'Mute microphone'}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                  transition-all border
                  ${voiceMuted
                    ? 'bg-white/[0.06] text-[#f0ece4]/40 border-[#C4A35A]/15'
                    : 'bg-[#009B3A]/20 text-[#86EFAC] border-[#009B3A]/30'
                  }`}
    >
      {voiceMuted ? '🎙️✕' : '🎙️'}
      {typeof voiceParticipants === 'number' && (
        <span className="opacity-70">{voiceParticipants}</span>
      )}
    </button>
  )}
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/components/game/GameScreen.tsx
git commit -m "feat: add voice chat mic toggle button to GameScreen"
```

---

### Task 5: Wire useVoiceChat into OnlineGame

**Files:**
- Modify: `packages/client/src/pages/OnlineGame.tsx`

**Context:** `useVoiceChat` must only be called when the game is actually in progress (not in lobby/waiting phases) to avoid requesting mic access early. We use an inner `VoiceManager` component that is only mounted in the playing phase — this is the correct way to call a hook conditionally without breaking the rules of hooks.

`VoiceManager` exposes voice state upward using refs rather than setState callbacks to avoid re-render loops. `isActive` is included in the state so `onToggleMute` is only passed to `GameScreen` when voice is actually available.

**Spectator guard:** `VoiceManager` must NOT be rendered for spectators (they should not join voice).

- [ ] **Step 1: Import useVoiceChat**

At the top of `packages/client/src/pages/OnlineGame.tsx`, add:
```ts
import { useVoiceChat } from '../hooks/useVoiceChat.js';
```

- [ ] **Step 2: Add the VoiceManager inner component above the OnlineGame export**

```tsx
interface VoiceState {
  isMuted: boolean;
  isActive: boolean;
  participantCount: number;
  toggleMute: () => void;
}

function VoiceManager({
  roomCode,
  playerId,
  players,
  stateRef,
}: {
  roomCode: string;
  playerId: string;
  players: Player[];
  stateRef: React.MutableRefObject<VoiceState>;
}) {
  const voice = useVoiceChat(roomCode, playerId, players);
  // Write latest voice state into the ref so OnlineGame can read it
  stateRef.current = voice;
  return null;
}
```

- [ ] **Step 3: Add VoiceManager component and voice state to OnlineGame**

Replace the earlier `VoiceManager` stub from Step 2 with this final version. `VoiceManager` uses `useEffect` (not render-phase side effects) to notify `OnlineGame` when voice state changes — safe under React 19 concurrent rendering and Strict Mode:

```tsx
interface VoiceState {
  isMuted: boolean;
  isActive: boolean;
  participantCount: number;
  toggleMute: () => void;
}

function VoiceManager({
  roomCode,
  playerId,
  players,
  onUpdate,
}: {
  roomCode: string;
  playerId: string;
  players: Player[];
  onUpdate: (state: VoiceState) => void;
}) {
  const voice = useVoiceChat(roomCode, playerId, players);

  // Notify parent only when tracked values change — runs after render, not during
  useEffect(() => {
    onUpdate(voice);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.isMuted, voice.isActive, voice.participantCount, onUpdate]);

  return null;
}
```

In the `OnlineGame` component body, add:

```ts
const voiceStateRef = useRef<VoiceState>({
  isMuted: false,
  isActive: false,
  participantCount: 0,
  toggleMute: () => {},
});
const [voiceMuted, setVoiceMuted] = useState(false);
const [voiceActive, setVoiceActive] = useState(false);
const [voiceParticipants, setVoiceParticipants] = useState(0);

const handleVoiceUpdate = useCallback((state: VoiceState) => {
  voiceStateRef.current = state;
  setVoiceMuted(state.isMuted);
  setVoiceActive(state.isActive);
  setVoiceParticipants(state.participantCount);
}, []);
```

- [ ] **Step 4: Render VoiceManager and wire props in the playing phase**

Replace the playing phase render block (around line 313–335) with:

```tsx
if (phase === 'playing' && gameState) {
  return (
    <div className="relative">
      {/* Only non-spectators join voice chat */}
      {!isSpectator && (
        <VoiceManager
          roomCode={roomCode}
          playerId={playerId}
          players={gameState.players}
          onUpdate={handleVoiceUpdate}
        />
      )}
      <GameScreen
        state={gameState}
        onRoll={handleRoll}
        onSelectMove={handleSelectMove}
        onPass={handlePass}
        onPlayAgain={handleLeaveRoom}
        onHome={() => navigate('/')}
        localPlayerId={playerId}
        onRematch={handleRematch}
        eloChange={eloChange}
        isSpectator={isSpectator}
        {/* Only pass voice props when voice is active — hides mic button otherwise */}
        voiceMuted={voiceActive ? voiceMuted : undefined}
        onToggleMute={voiceActive ? () => voiceStateRef.current.toggleMute() : undefined}
        voiceParticipants={voiceActive ? voiceParticipants : undefined}
      />
      <ChatPanel
        messages={chatMessages}
        onSend={handleSendChat}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(o => !o)}
      />
    </div>
  );
}
```

**Note:** JSX comments inside JSX attribute lists use `{/* */}` syntax. Remove those comment lines in the actual implementation — they're for explanation only.

- [ ] **Step 5: Add missing imports**

Ensure these are all present in the import block of `OnlineGame.tsx`:
```ts
import { useState, useEffect, useCallback, useRef } from 'react';
```
`useRef` may already be imported — check line 1 and add if missing.

Also add the `VoiceState` type if defined in a separate file, or define it inline above `VoiceManager`.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd packages/client && npx tsc --noEmit
```
Expected: no errors. Fix any JSX attribute comment syntax errors (remove the comment lines).

- [ ] **Step 7: Commit**

```bash
git add packages/client/src/pages/OnlineGame.tsx
git commit -m "feat: wire voice chat into online game"
```

---

## Chunk 4: End-to-end verification

### Task 6: Manual end-to-end test

**Context:** No automated test framework is configured. Verify with two browser tabs.

- [ ] **Step 1: Start the development servers**

```bash
# Terminal 1 — server
cd packages/server && npm run dev

# Terminal 2 — client
cd packages/client && npm run dev
```

- [ ] **Step 2: Verify mic button appears**

1. Open two browser tabs to `http://localhost:5173`
2. In both, go to Online → enter a name → create/join room → start game
3. Confirm the 🎙️ button appears in both tabs (once voice connects)

- [ ] **Step 3: Verify mute toggle**

1. Click 🎙️ in one tab → confirms it dims to muted style
2. Click again → confirms it returns to active style

- [ ] **Step 4: Verify audio (requires mic)**

1. Allow mic access when prompted in both tabs
2. Speak in one tab — confirm audio plays in the other
3. Mute one tab — confirm the other no longer hears it

- [ ] **Step 5: Verify mic denied hides the button**

1. In a fresh browser profile with mic blocked (or deny the permission prompt)
2. Join an online game
3. Confirm the 🎙️ button does not appear (voice is inactive)
4. Confirm the game is otherwise fully functional

- [ ] **Step 6: Verify spectator has no voice**

1. Open a third tab and spectate a game in progress
2. Confirm no mic permission is requested and no 🎙️ button appears

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: voice chat end-to-end verified"
```
