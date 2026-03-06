import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import type { GameState, Player, Color } from '@ludi/shared';
import { COLOR_HEX } from '@ludi/shared';
import { getSocket, connectSocket, disconnectSocket } from '../services/socketService.js';
import GameScreen from '../components/game/GameScreen.js';

interface ActiveGame {
  code: string;
  players: { name: string; colors: Color[] }[];
  turnCount: number;
  spectatorCount: number;
}

export default function Spectate() {
  const navigate = useNavigate();
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [watchingCode, setWatchingCode] = useState<string | null>(null);

  useEffect(() => {
    connectSocket();
    return () => { disconnectSocket(); };
  }, []);

  // Fetch active games
  const refreshGames = useCallback(() => {
    setLoading(true);
    const socket = getSocket();
    socket.emit('room:list_active', (result: ActiveGame[]) => {
      setGames(result || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refreshGames();
    const interval = setInterval(refreshGames, 5000);
    return () => clearInterval(interval);
  }, [refreshGames]);

  // Listen for game updates while spectating
  useEffect(() => {
    if (!watchingCode) return;
    const socket = getSocket();

    const handleUpdate = (state: GameState) => {
      setGameState(state);
    };

    socket.on('game:state_update', handleUpdate);
    return () => { socket.off('game:state_update', handleUpdate); };
  }, [watchingCode]);

  const handleSpectate = useCallback((code: string) => {
    const socket = getSocket();
    socket.emit('room:spectate', { roomCode: code, spectatorName: 'Spectator' },
      (response: { gameState?: GameState; players?: Player[]; error?: string }) => {
        if (response.error) return;
        if (response.gameState) {
          setGameState(response.gameState);
          setWatchingCode(code);
        }
      }
    );
  }, []);

  const handleStopWatching = useCallback(() => {
    setGameState(null);
    setWatchingCode(null);
    disconnectSocket();
    connectSocket();
    refreshGames();
  }, [refreshGames]);

  // Watching a game
  if (watchingCode && gameState) {
    return (
      <GameScreen
        state={gameState}
        onRoll={() => {}}
        onSelectMove={() => {}}
        onPass={() => {}}
        onPlayAgain={handleStopWatching}
        onHome={() => navigate('/')}
        isSpectator
      />
    );
  }

  // Browse games
  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h2 className="font-[Playfair_Display] text-2xl font-bold text-gold mb-8 tracking-wide">
        Watch Games
      </h2>

      {loading ? (
        <p className="text-[#C4A35A]/40 text-sm">Looking for active games...</p>
      ) : games.length === 0 ? (
        <div className="text-center">
          <p className="text-[#C4A35A]/40 text-sm mb-2">No games in progress</p>
          <p className="text-[#C4A35A]/30 text-xs">Games will appear here when players start playing</p>
        </div>
      ) : (
        <div className="space-y-3 w-full max-w-sm">
          {games.map(game => (
            <button
              key={game.code}
              onClick={() => handleSpectate(game.code)}
              className="w-full glass-panel rounded-lg p-4 text-left hover:border-[#C4A35A]/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {game.players.map((p, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {p.colors.map(c => (
                        <div
                          key={c}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLOR_HEX[c] }}
                        />
                      ))}
                      <span className="text-sm text-[#f0ece4] font-medium">{p.name}</span>
                      {i < game.players.length - 1 && (
                        <span className="text-[#C4A35A]/30 text-xs mx-1">vs</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#C4A35A]/40">Turn {game.turnCount}</span>
                {game.spectatorCount > 0 && (
                  <span className="text-[10px] text-[#C4A35A]/30">
                    {game.spectatorCount} watching
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={refreshGames}
        className="mt-6 btn-secondary px-6 py-2 rounded-lg text-[#C4A35A]/60 font-medium text-sm
                   hover:text-[#C4A35A] transition-colors"
      >
        Refresh
      </button>

      <button
        onClick={() => navigate('/')}
        className="mt-4 px-8 py-3 rounded-lg btn-secondary text-[#C4A35A]/60 font-medium
                   hover:text-[#C4A35A] transition-colors"
      >
        Back to Home
      </button>
    </div>
  );
}
