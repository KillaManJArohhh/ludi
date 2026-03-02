import { COLOR_HEX, COLOR_DARK } from '@ludi/shared';
import type { Piece as PieceType } from '@ludi/shared';
import { getPieceSvgPos } from '@ludi/shared';

interface PieceProps {
  piece: PieceType;
  isSelectable: boolean;
  isSelected: boolean;
  onClick?: () => void;
  animating?: boolean;
  /** Pixel offset from center when sharing a square */
  offset?: { dx: number; dy: number };
  /** Scale factor (1 = normal, smaller when sharing) */
  scale?: number;
}

export default function Piece({
  piece,
  isSelectable,
  isSelected,
  onClick,
  animating,
  offset,
  scale = 1,
}: PieceProps) {
  if (piece.state === 'home') return null;

  const basePos = getPieceSvgPos(piece);
  const px = basePos.x + (offset?.dx ?? 0);
  const py = basePos.y + (offset?.dy ?? 0);

  const r = 12 * scale;
  const innerR = 5.5 * scale;
  const shadowR = 12 * scale;
  const selectR = 17 * scale;
  const touchR = 22 * scale;
  const fontSize = Math.max(5, 7.5 * scale);

  const hex = COLOR_HEX[piece.color];
  const dark = COLOR_DARK[piece.color];

  return (
    <g
      onClick={isSelectable ? onClick : undefined}
      style={{ cursor: isSelectable ? 'pointer' : 'default' }}
      className={isSelectable ? 'piece-selectable' : animating ? 'piece-moving' : ''}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={px}
          cy={py}
          r={selectR}
          fill="none"
          stroke="#FED100"
          strokeWidth="2"
          filter="url(#glow)"
        />
      )}

      {/* Shadow */}
      <circle
        cx={px + 0.5}
        cy={py + 2}
        r={shadowR}
        fill="rgba(0,0,0,0.35)"
      />

      {/* Main piece body */}
      <circle
        cx={px}
        cy={py}
        r={r}
        fill={hex}
        stroke={dark}
        strokeWidth="1.5"
      />

      {/* 3D sheen */}
      <circle
        cx={px}
        cy={py}
        r={r}
        fill="url(#piece-sheen)"
      />

      {/* Inner ring detail */}
      <circle
        cx={px}
        cy={py}
        r={innerR}
        fill="none"
        stroke={dark}
        strokeWidth="0.8"
        opacity="0.5"
      />

      {/* Piece number */}
      <text
        x={px}
        y={py + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fill="#fff"
        fontWeight="bold"
        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {piece.index + 1}
      </text>

      {/* Touch target (invisible, larger for mobile) */}
      {isSelectable && (
        <circle
          cx={px}
          cy={py}
          r={touchR}
          fill="transparent"
          onClick={onClick}
        />
      )}
    </g>
  );
}
