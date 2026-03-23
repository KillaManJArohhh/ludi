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

  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    const socket = getSocket();
    socket.emit('voice:ice_candidate', {
      roomCode: currentRoomCode,
      targetPlayerId: remotePlayerId,
      candidate: e.candidate.toJSON(),
    });
  };

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

// Named handler references for clean removal
let handlerPeerJoined: ((data: { playerId: string }) => void) | null = null;
let handlerOffer: ((data: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => void) | null = null;
let handlerAnswer: ((data: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => void) | null = null;
let handlerIceCandidate: ((data: { fromPlayerId: string; candidate: RTCIceCandidateInit }) => void) | null = null;
let handlerPlayerLeft: ((data: { playerId: string }) => void) | null = null;

function setupSocketListeners() {
  const socket = getSocket();

  handlerPeerJoined = async ({ playerId }: { playerId: string }) => {
    if (!_active || playerId === localPlayerId) return;
    closePeer(playerId); // Close any stale connection before creating a new one
    const pc = createPeerConnection(playerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('voice:offer', {
      roomCode: currentRoomCode,
      targetPlayerId: playerId,
      sdp: pc.localDescription,
    });
  };

  handlerOffer = async ({ fromPlayerId, sdp }: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => {
    if (!_active) return;
    if (fromPlayerId === localPlayerId) return;
    closePeer(fromPlayerId); // Close any stale connection before creating a new one
    const pc = createPeerConnection(fromPlayerId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('voice:answer', {
      roomCode: currentRoomCode,
      targetPlayerId: fromPlayerId,
      sdp: pc.localDescription,
    });
  };

  handlerAnswer = async ({ fromPlayerId, sdp }: { fromPlayerId: string; sdp: RTCSessionDescriptionInit }) => {
    const entry = peers.get(fromPlayerId);
    if (!entry) return;
    await entry.connection.setRemoteDescription(new RTCSessionDescription(sdp));
  };

  handlerIceCandidate = async ({ fromPlayerId, candidate }: { fromPlayerId: string; candidate: RTCIceCandidateInit }) => {
    const entry = peers.get(fromPlayerId);
    if (!entry) return;
    try {
      await entry.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore stale candidates
    }
  };

  handlerPlayerLeft = ({ playerId }: { playerId: string }) => {
    closePeer(playerId);
  };

  socket.on('voice:peer_joined', handlerPeerJoined);
  socket.on('voice:offer', handlerOffer);
  socket.on('voice:answer', handlerAnswer);
  socket.on('voice:ice_candidate', handlerIceCandidate);
  socket.on('room:player_left', handlerPlayerLeft);
}

function teardownSocketListeners() {
  const socket = getSocket();
  if (handlerPeerJoined) { socket.off('voice:peer_joined', handlerPeerJoined); handlerPeerJoined = null; }
  if (handlerOffer) { socket.off('voice:offer', handlerOffer); handlerOffer = null; }
  if (handlerAnswer) { socket.off('voice:answer', handlerAnswer); handlerAnswer = null; }
  if (handlerIceCandidate) { socket.off('voice:ice_candidate', handlerIceCandidate); handlerIceCandidate = null; }
  if (handlerPlayerLeft) { socket.off('room:player_left', handlerPlayerLeft); handlerPlayerLeft = null; }
}

export const voiceChat = {
  async connect(playerId: string, roomCode: string): Promise<void> {
    if (typeof RTCPeerConnection === 'undefined') return;
    if (_active) return; // Already connected — prevent duplicate listeners

    localPlayerId = playerId;
    currentRoomCode = roomCode;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      return;
    }

    _active = true;

    for (const track of localStream.getAudioTracks()) {
      track.enabled = !muted;
    }

    setupSocketListeners();

    const socket = getSocket();
    socket.emit('voice:join', { roomCode });
  },

  disconnect(): void {
    _active = false;
    muted = false; // Reset mute state for next session
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
