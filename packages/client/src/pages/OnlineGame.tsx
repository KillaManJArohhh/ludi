import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import type { GameState, GameConfig, MoveOption, ChatMessage, Player } from '@ludi/shared';
import { getSocket, connectSocket, disconnectSocket } from '../services/socketService.js';
import LobbyScreen from '../components/lobby/LobbyScreen.js';
import WaitingRoom from '../components/lobby/WaitingRoom.js';
import GameScreen from '../components/game/GameScreen.js';
import ChatPanel from '../components/chat/ChatPanel.js';

type Phase = 'lobby' | 'waiting' | 'playing';

const SESSION_KEY = 'ludi_online_session';

interface SessionData {
  roomCode: string;
  playerId: string;
  playerName: string;
}

function saveSession(data: SessionData) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function loadSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.roomCode && data.playerId && data.playerName) return data;
    return null;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export default function OnlineGame() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    playerCount: 4,
    diceMode: 'double',
    lockKillsLock: false,
    teamSharing: false,
    turnTimer: 0,
  });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const roomCodeRef = useRef(roomCode);
  const playerIdRef = useRef(playerId);
  roomCodeRef.current = roomCode;
  playerIdRef.current = playerId;

  // Connect socket on mount, disconnect on unmount
  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    // Attempt reconnection from saved session
    const saved = loadSession();
    if (saved) {
      setReconnecting(true);
      setPlayerName(saved.playerName);
      setNameSet(true);
      socket.emit('player:reconnect', { roomCode: saved.roomCode, playerId: saved.playerId });
    }

    socket.on('reconnect:success', ({ roomCode: code, gameState: state, players: playerList, status, hostId }: {
      roomCode: string;
      gameState: GameState | null;
      players: Player[];
      status: string;
      hostId: string;
    }) => {
      const saved = loadSession();
      if (!saved) return;
      setRoomCode(code);
      setPlayerId(saved.playerId);
      setPlayers(playerList);
      setIsHost(saved.playerId === hostId);
      setReconnecting(false);
      if (status === 'playing' && state) {
        setGameState(state);
        setPhase('playing');
      } else {
        setPhase('waiting');
      }
    });

    socket.on('reconnect:failed', () => {
      clearSession();
      setReconnecting(false);
    });

    socket.on('room:player_joined', ({ players: playerList }: { players: Player[] }) => {
      if (playerList) {
        setPlayers(playerList);
      }
    });

    socket.on('game:started', (state: GameState) => {
      setGameState(state);
      setPlayers(state.players);
      setPhase('playing');
    });

    socket.on('game:state_update', (state: GameState) => {
      setGameState(state);
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('reconnect:success');
      socket.off('reconnect:failed');
      socket.off('room:player_joined');
      socket.off('game:started');
      socket.off('game:state_update');
      socket.off('chat:message');
      disconnectSocket();
    };
  }, []);

  const handleCreateRoom = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:create', { config: gameConfig, playerName }, (response: { roomCode: string; playerId: string; players: Player[] }) => {
      setRoomCode(response.roomCode);
      setPlayerId(response.playerId);
      setIsHost(true);
      setPlayers(response.players);
      saveSession({ roomCode: response.roomCode, playerId: response.playerId, playerName });
      setPhase('waiting');
    });
  }, [gameConfig, playerName]);

  const handleJoinRoom = useCallback((code: string) => {
    const socket = getSocket();
    socket.emit('room:join', { roomCode: code, playerName }, (response: { roomCode?: string; playerId?: string; players?: Player[]; error?: string }) => {
      if (response.error) {
        setError(response.error);
        setTimeout(() => setError(null), 3000);
        return;
      }
      setRoomCode(response.roomCode!);
      setPlayerId(response.playerId!);
      setIsHost(false);
      if (response.players) setPlayers(response.players);
      saveSession({ roomCode: response.roomCode!, playerId: response.playerId!, playerName });
      setPhase('waiting');
    });
  }, [playerName]);

  const handleStartGame = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:start', { roomCode: roomCodeRef.current });
  }, []);

  const handleLeaveRoom = useCallback(() => {
    clearSession();
    disconnectSocket();
    setPhase('lobby');
    setRoomCode('');
    setPlayerId('');
    setPlayers([]);
    setGameState(null);
    setChatMessages([]);
    connectSocket();
  }, []);

  const handleRoll = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:roll_dice', { roomCode: roomCodeRef.current });
  }, []);

  const handleSelectMove = useCallback((option: MoveOption) => {
    const socket = getSocket();
    socket.emit('game:select_move', { roomCode: roomCodeRef.current, moveOption: option });
  }, []);

  const handlePass = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:pass_turn', { roomCode: roomCodeRef.current });
  }, []);

  const handleRematch = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:rematch', { roomCode: roomCodeRef.current });
  }, []);

  const handleSendChat = useCallback((text: string, isPreset: boolean) => {
    const socket = getSocket();
    socket.emit('chat:message', {
      roomCode: roomCodeRef.current,
      playerId: playerIdRef.current,
      playerName,
      text,
      isPreset,
    });
  }, [playerName]);

  // Reconnecting screen
  if (reconnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h2 className="font-[Playfair_Display] text-3xl font-bold text-gold mb-4 tracking-wide">
          Reconnecting...
        </h2>
        <p className="text-[#C4A35A]/50 text-sm">Rejoining your game session</p>
      </div>
    );
  }

  // Name entry screen
  if (!nameSet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h2 className="font-[Playfair_Display] text-3xl font-bold text-gold mb-8 tracking-wide">
          Online Multiplayer
        </h2>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <label className="text-[11px] text-[#C4A35A]/50 font-medium tracking-wide uppercase">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && playerName.trim() && setNameSet(true)}
            placeholder="Enter your name"
            maxLength={16}
            className="glass-panel rounded-lg px-4 py-3 text-[#f0ece4] text-center
                       text-lg outline-none focus:border-[#C4A35A]/30
                       placeholder:text-[#C4A35A]/20"
            autoFocus
          />
          <button
            onClick={() => playerName.trim() && setNameSet(true)}
            disabled={!playerName.trim()}
            className="btn-primary py-3 rounded-xl text-white font-bold text-lg tracking-wide
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <button
            onClick={() => navigate('/')}
            className="py-3 rounded-lg btn-secondary text-[#C4A35A]/60 font-medium
                       hover:text-[#C4A35A] transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Lobby phase
  if (phase === 'lobby') {
    return (
      <div className="relative">
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-lg px-6 py-3
                          border border-red-500/30 text-red-400 text-sm font-medium">
            {error}
          </div>
        )}
        <LobbyScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onBack={() => navigate('/')}
        />
      </div>
    );
  }

  // Waiting phase
  if (phase === 'waiting') {
    return (
      <WaitingRoom
        roomCode={roomCode}
        players={players}
        maxPlayers={gameConfig.playerCount}
        isHost={isHost}
        onStart={handleStartGame}
        onLeave={handleLeaveRoom}
      />
    );
  }

  // Playing phase
  if (phase === 'playing' && gameState) {
    return (
      <div className="relative">
        <GameScreen
          state={gameState}
          onRoll={handleRoll}
          onSelectMove={handleSelectMove}
          onPass={handlePass}
          onPlayAgain={handleLeaveRoom}
          onHome={() => navigate('/')}
          localPlayerId={playerId}
          onRematch={handleRematch}
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

  return null;
}
