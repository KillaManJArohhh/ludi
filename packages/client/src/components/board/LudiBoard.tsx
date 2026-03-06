import { useMemo, useState } from 'react';
import type { GameState, MoveOption, Color, Piece as PieceType } from '@ludi/shared';
import {
  BOARD_SIZE,
  CIRCUIT_POSITIONS,
  PLAYER_COLORS,
  START_POSITIONS,
  HOME_ENTRY_POSITIONS,
  CROSS_SQUARES,
  CELL_SIZE,
  COLOR_HEX,
  BASE_POSITIONS,
  getSquareColor,
} from '@ludi/shared';
import { gridToSvg, getPiecesByColor, getPieceSvgPos } from '@ludi/shared';
import type { GameNotification } from '../game/GameScreen.js';
import BoardBackground from './BoardBackground.js';
import BoardSquare from './BoardSquare.js';
import HomeBase from './HomeBase.js';
import HomeStretch from './HomeStretch.js';
import CenterHome from './CenterHome.js';
import Piece from './Piece.js';

/** Split a combined MoveOption to only include moves for a specific piece.
 *  This prevents the tooltip/square-click from auto-executing the other piece's move. */
function splitForPiece(option: MoveOption, pieceId: string): MoveOption {
  const pMoves = option.moves.filter(m => m.pieceId === pieceId);
  if (pMoves.length === option.moves.length) return option; // already single-piece
  const indices = option.moves
    .map((m, i) => m.pieceId === pieceId ? i : -1)
    .filter(i => i >= 0);
  return {
    moves: pMoves,
    diceUsed: indices.map(i => option.diceUsed[i]),
    description: option.description,
  };
}

interface LudiBoardProps {
  state: GameState;
  onSelectMove?: (option: MoveOption) => void;
  interactive?: boolean;
  notification?: GameNotification | null;
}

export default function LudiBoard({ state, onSelectMove, interactive = true, notification }: LudiBoardProps) {
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  // Determine which pieces are selectable (belong to current player and have moves)
  const selectablePieceIds = useMemo(() => {
    if (!interactive || state.turnPhase !== 'selecting_piece') return new Set<string>();
    const ids = new Set<string>();
    for (const option of state.moveOptions) {
      for (const move of option.moves) {
        ids.add(move.pieceId);
      }
    }
    return ids;
  }, [state.moveOptions, state.turnPhase, interactive]);

  // Get move options for the selected piece
  const selectedPieceMoves = useMemo(() => {
    if (!selectedPieceId) return [];
    return state.moveOptions.filter(opt =>
      opt.moves.some(m => m.pieceId === selectedPieceId)
    );
  }, [selectedPieceId, state.moveOptions]);

  // Build a map from circuit index → gate info for the 4 gate squares
  const gateSquareMap = useMemo(() => {
    const map = new Map<number, { color: Color; isOpen: boolean }>();
    for (const color of PLAYER_COLORS) {
      const gatePos = HOME_ENTRY_POSITIONS[color];
      map.set(gatePos, { color, isOpen: state.gatesOpened[color] });
    }
    return map;
  }, [state.gatesOpened]);

  // Get highlighted destination squares
  const highlightedPositions = useMemo(() => {
    const positions = new Set<string>();
    for (const option of selectedPieceMoves) {
      for (const move of option.moves) {
        if (move.pieceId === selectedPieceId) {
          if (move.to.circuitPos !== null) {
            const gp = CIRCUIT_POSITIONS[move.to.circuitPos];
            positions.add(`${gp.row}-${gp.col}`);
          }
        }
      }
    }
    return positions;
  }, [selectedPieceMoves, selectedPieceId]);

  const handlePieceClick = (piece: PieceType) => {
    // If another piece is already selected and the clicked piece sits on a
    // highlighted destination square, treat as a destination click (confirm move)
    if (selectedPieceId && selectedPieceId !== piece.id && piece.circuitPos !== null) {
      const gp = CIRCUIT_POSITIONS[piece.circuitPos];
      if (highlightedPositions.has(`${gp.row}-${gp.col}`)) {
        handleSquareClick(piece.circuitPos);
        return;
      }
    }

    if (!selectablePieceIds.has(piece.id)) return;

    if (selectedPieceId === piece.id) {
      setSelectedPieceId(null);
      return;
    }

    setSelectedPieceId(piece.id);
  };

  const handleSquareClick = (circuitIndex: number) => {
    if (!selectedPieceId || selectedPieceMoves.length === 0) return;

    const matchingOption = selectedPieceMoves.find(opt =>
      opt.moves.some(m => m.pieceId === selectedPieceId && m.to.circuitPos === circuitIndex)
    );

    if (matchingOption && onSelectMove) {
      const partial = splitForPiece(matchingOption, selectedPieceId);
      onSelectMove(partial);
      setSelectedPieceId(null);
    }
  };

  // All pieces grouped for rendering
  const allPieces = Object.values(state.pieces);

  // Compute layout offsets for pieces sharing the same position.
  // Groups active circuit pieces and home-stretch pieces by their position key.
  const pieceLayout = useMemo(() => {
    const groups = new Map<string, string[]>();

    for (const p of allPieces) {
      if (p.state === 'base' || p.state === 'home') continue;
      let key: string;
      if (p.homePos !== null) {
        key = `hs-${p.color}-${p.homePos}`;
      } else if (p.circuitPos !== null) {
        key = `c-${p.circuitPos}`;
      } else {
        continue;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p.id);
    }

    // 2-piece offset pattern (side by side), 3+ spread in a ring
    const offsets2 = [{ dx: -6, dy: 0 }, { dx: 6, dy: 0 }];
    const offsets3 = [{ dx: -7, dy: -5 }, { dx: 7, dy: -5 }, { dx: 0, dy: 7 }];
    const offsets4 = [{ dx: -7, dy: -7 }, { dx: 7, dy: -7 }, { dx: -7, dy: 7 }, { dx: 7, dy: 7 }];

    const layoutMap = new Map<string, { offset: { dx: number; dy: number }; scale: number }>();
    for (const [, ids] of groups) {
      if (ids.length < 2) continue;
      const scale = ids.length === 2 ? 0.72 : ids.length === 3 ? 0.62 : 0.55;
      const offsets = ids.length === 2 ? offsets2 : ids.length === 3 ? offsets3 : offsets4;
      ids.forEach((id, i) => {
        layoutMap.set(id, { offset: offsets[i % offsets.length], scale });
      });
    }
    return layoutMap;
  }, [allPieces]);

  return (
    <svg
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      className="w-full max-w-[520px] mx-auto"
      style={{ touchAction: 'manipulation', minWidth: 280 }}
    >
      {/* Layer 1: Wood background */}
      <BoardBackground />

      {/* Layer 2: Cross-shaped playing area background */}
      {CROSS_SQUARES.map(pos => (
        <rect
          key={`cross-${pos.row}-${pos.col}`}
          x={pos.col * CELL_SIZE + 0.5}
          y={pos.row * CELL_SIZE + 0.5}
          width={CELL_SIZE - 1}
          height={CELL_SIZE - 1}
          fill="#E8D5B8"
          opacity="0.6"
        />
      ))}

      {/* Layer 3: Circuit squares */}
      {CIRCUIT_POSITIONS.map((pos, i) => {
        const gate = gateSquareMap.get(i);
        return (
          <BoardSquare
            key={`circuit-${i}`}
            pos={pos}
            fill={getSquareColor(i)}
            circuitIndex={i}
            isStartSquare={Object.values(START_POSITIONS).includes(i)}
            isHighlighted={highlightedPositions.has(`${pos.row}-${pos.col}`)}
            gateColor={gate ? COLOR_HEX[gate.color] : undefined}
            gateOpen={gate ? gate.isOpen : undefined}
            onClick={() => handleSquareClick(i)}
          />
        );
      })}

      {/* Layer 4: Home stretches */}
      {PLAYER_COLORS.map(color => (
        <HomeStretch key={`hs-${color}`} color={color} />
      ))}

      {/* Layer 5: Center home */}
      <CenterHome />

      {/* Layer 6: Corner bases */}
      {PLAYER_COLORS.map(color => (
        <HomeBase
          key={`base-${color}`}
          color={color}
          pieces={getPiecesByColor(state, color).filter(p => p.state === 'base')}
        />
      ))}

      {/* Layer 7: Pieces */}
      {allPieces.map(piece => {
        const layout = pieceLayout.get(piece.id);
        return (
          <Piece
            key={piece.id}
            piece={piece}
            isSelectable={selectablePieceIds.has(piece.id)}
            isSelected={selectedPieceId === piece.id}
            onClick={() => handlePieceClick(piece)}
            offset={layout?.offset}
            scale={layout?.scale}
          />
        );
      })}

      {/* Layer 8: Roll notification in player's base — dice numbers only */}
      {notification && (notification.type === 'roll' || notification.type === 'no_moves') && notification.diceValues && notification.diceValues.length > 0 && (() => {
        const basePos = BASE_POSITIONS[notification.playerColor];
        const centerRow = basePos.reduce((s, p) => s + p.row, 0) / basePos.length;
        const centerCol = basePos.reduce((s, p) => s + p.col, 0) / basePos.length;
        const cx = centerCol * CELL_SIZE + CELL_SIZE / 2;
        const cy = centerRow * CELL_SIZE + CELL_SIZE / 2;
        const dv = notification.diceValues!;

        return (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={cx} cy={cy} r="38" fill="#0d0805" opacity="0.7" />
            <circle cx={cx} cy={cy} r="38" fill="none" stroke={notification.color} strokeWidth="2" opacity="0.4" />
            {dv.map((v, i) => {
              const totalWidth = dv.length === 1 ? 0 : (dv.length - 1) * 36;
              const dx = dv.length === 1 ? 0 : -totalWidth / 2 + i * 36;
              return (
                <text
                  key={i}
                  x={cx + dx}
                  y={cy}
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize="28"
                  fontWeight="900"
                  fontFamily="'Playfair Display', serif"
                  fill="#ffffff"
                  stroke={notification.color}
                  strokeWidth="0.5"
                >
                  {v}
                </text>
              );
            })}
          </g>
        );
      })()}

      {/* Layer 9: Move tooltip (speech bubble) for selected piece */}
      {selectedPieceId && selectedPieceMoves.length > 0 && (() => {
        const piece = state.pieces[selectedPieceId];
        if (!piece || piece.state === 'home') return null;

        // Build choices showing only what THIS piece does, deduplicated by destination
        const seenKeys = new Set<string>();
        const choices: { desc: string; isCapture: boolean; isHome: boolean; option: MoveOption }[] = [];

        for (const opt of selectedPieceMoves) {
          const pMoves = opt.moves.filter(m => m.pieceId === selectedPieceId);
          if (pMoves.length === 0) continue;
          const last = pMoves[pMoves.length - 1];
          const key = `${last.to.circuitPos}:${last.to.homePos}:${last.to.state}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          let desc: string;
          const isCapture = pMoves.some(m => m.isCapture);
          const isHome = last.to.state === 'home';

          if (pMoves.length === 1) {
            const m = pMoves[0];
            if (m.isExit) desc = `Use ${m.diceValue} — exit base`;
            else if (isHome) desc = `Use ${m.diceValue} — reach home!`;
            else if (m.to.homePos !== null) desc = `Use ${m.diceValue} — home stretch`;
            else if (m.isBlockMove) desc = `Use ${m.diceValue} — move block`;
            else desc = `Use ${m.diceValue} — move forward`;
          } else {
            desc = `Use ${pMoves.map(m => m.diceValue).join(' then ')}`;
            if (isHome) desc += ' — reach home!';
            else if (last.to.homePos !== null) desc += ' — home stretch';
            else desc += ' — move forward';
          }
          choices.push({ desc, isCapture, isHome, option: splitForPiece(opt, selectedPieceId!) });
        }

        if (choices.length === 0) return null;

        const pos = getPieceSvgPos(piece);
        const lo = pieceLayout.get(piece.id);
        const px = pos.x + (lo?.offset?.dx ?? 0);
        const py = pos.y + (lo?.offset?.dy ?? 0);

        // Tooltip sizing
        const w = 175;
        const rowH = 30;
        const pad = 5;
        const n = choices.length;
        const h = n * rowH + pad * 2 + 2;
        const arrowSz = 7;
        const gap = 18;

        // Position above piece by default, below if near top edge
        const above = py > h + arrowSz + gap + 10;
        const tipY = above ? py - gap - arrowSz - h : py + gap + arrowSz;
        const tipX = Math.max(2, Math.min(px - w / 2, BOARD_SIZE - w - 2));

        // Clamp arrow x within tooltip bounds
        const arrowPx = Math.max(tipX + arrowSz + 2, Math.min(px, tipX + w - arrowSz - 2));
        const arrowBaseY = above ? py - gap : py + gap;
        const arrowTipY = above ? arrowBaseY - arrowSz : arrowBaseY + arrowSz;

        const arrowPts = above
          ? `${arrowPx - arrowSz},${arrowTipY} ${arrowPx + arrowSz},${arrowTipY} ${arrowPx},${arrowBaseY}`
          : `${arrowPx - arrowSz},${arrowTipY} ${arrowPx + arrowSz},${arrowTipY} ${arrowPx},${arrowBaseY}`;

        return (
          <g>
            {/* Arrow pointing toward the piece */}
            <polygon
              points={arrowPts}
              fill="#1e1812"
              stroke="rgba(196,163,90,0.25)"
              strokeWidth="0.5"
            />
            {/* Tooltip body */}
            <foreignObject x={tipX} y={tipY} width={w} height={h}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e1812f7, #14100cfa)',
                  border: '1px solid rgba(196,163,90,0.22)',
                  borderRadius: 8,
                  padding: pad,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.55)',
                }}
              >
                {choices.map((c, i) => (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMove?.(c.option);
                      setSelectedPieceId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onSelectMove?.(c.option);
                        setSelectedPieceId(null);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 8px',
                      fontSize: 10,
                      lineHeight: '1.3',
                      color: '#f0ece4cc',
                      borderRadius: 5,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(196,163,90,0.12)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <span style={{ flex: 1 }}>{c.desc}</span>
                    {c.isCapture && (
                      <span style={{ color: '#DC2626', fontWeight: 700, fontSize: 9, flexShrink: 0 }}>CAPTURE</span>
                    )}
                    {c.isHome && (
                      <span style={{ color: '#FED100', fontWeight: 700, fontSize: 9, flexShrink: 0 }}>HOME</span>
                    )}
                  </div>
                ))}
              </div>
            </foreignObject>
          </g>
        );
      })()}
    </svg>
  );
}
