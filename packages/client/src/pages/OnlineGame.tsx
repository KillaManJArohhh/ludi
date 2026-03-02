import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import type { GameState, GameConfig, MoveOption, ChatMessage, Player } from '@ludi/shared';
import { getSocket, connectSocket, disconnectSocket } from '../services/socketService.js';
import LobbyScreen from '../components/lobby/LobbyScreen.js';
import WaitingRoom from '../components/lobby/WaitingRoom.js';
import GameScreen from '../components/game/GameScreen.js';
import ChatPanel from '../components/chat/ChatPanel.js';

type Phase = 'lobby' | 'waiting' | 'playing';

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
  });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [nameSet, setNameSet] = useState(false);

  const roomCodeRef = useRef(roomCode);
  const playerIdRef = useRef(playerId);
  roomCodeRef.current = roomCode;
  playerIdRef.current = playerId;

  // Connect socket on mount, disconnect on unmount
  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    socket.on('room:player_joined', ({ playerName: name, playerCount }) => {
      setPlayers(prev => {
        if (prev.some(p => p.name === name)) return prev;
        return [...prev, {
          id: `player-${playerCount}`,
          name,
          colors: [],
          isAI: false,
          isConnected: true,
        }];
      });
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
      socket.off('room:player_joined');
      socket.off('game:started');
      socket.off('game:state_update');
      socket.off('chat:message');
      disconnectSocket();
    };
  }, []);

  const handleCreateRoom = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:create', { config: gameConfig, playerName }, (response: { roomCode: string; playerId: string }) => {
      setRoomCode(response.roomCode);
      setPlayerId(response.playerId);
      setIsHost(true);
      setPlayers([{
        id: response.playerId,
        name: playerName,
        colors: [],
        isAI: false,
        isConnected: true,
      }]);
      setPhase('waiting');
    });
  }, [gameConfig, playerName]);

  const handleJoinRoom = useCallback((code: string) => {
    const socket = getSocket();
    socket.emit('room:join', { roomCode: code, playerName }, (response: { roomCode?: string; playerId?: string; error?: string }) => {
      if (response.error) {
        setError(response.error);
        setTimeout(() => setError(null), 3000);
        return;
      }
      setRoomCode(response.roomCode!);
      setPlayerId(response.playerId!);
      setIsHost(false);
      setPhase('waiting');
    });
  }, [playerName]);

  const handleStartGame = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:start', { roomCode: roomCodeRef.current });
  }, []);

  const handleLeaveRoom = useCallback(() => {
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
