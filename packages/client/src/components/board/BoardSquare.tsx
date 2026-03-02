import { CELL_SIZE } from '@ludi/shared';
import type { GridPos } from '@ludi/shared';

interface BoardSquareProps {
  pos: GridPos;
  fill: string;
  circuitIndex?: number;
  isHighlighted?: boolean;
  isStartSquare?: boolean;
  gateColor?: string;
  gateOpen?: boolean;
  onClick?: () => void;
}

export default function BoardSquare({
  pos,
  fill,
  circuitIndex,
  isHighlighted,
  isStartSquare,
  gateColor,
  gateOpen,
  onClick,
}: BoardSquareProps) {
  const x = pos.col * CELL_SIZE;
  const y = pos.row * CELL_SIZE;
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;

  return (
    <g onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {/* Main square */}
      <rect
        x={x + 1}
        y={y + 1}
        width={CELL_SIZE - 2}
        height={CELL_SIZE - 2}
        fill={fill}
        stroke={gateColor || '#6B5A3E'}
        strokeWidth={gateColor ? '2' : '0.3'}
        strokeOpacity={gateColor ? 1 : 0.5}
        rx="2"
      />

      {/* Start square marker — concentric rings */}
      {isStartSquare && (
        <>
          <circle cx={cx} cy={cy} r={8} fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
          <circle cx={cx} cy={cy} r={4} fill="#fff" opacity="0.15" />
        </>
      )}

      {/* Gate indicator */}
      {gateColor && (
        gateOpen ? (
          // Open gate: diamond outline with glow
          <polygon
            points={`${cx},${y + 5} ${x + CELL_SIZE - 5},${cy} ${cx},${y + CELL_SIZE - 5} ${x + 5},${cy}`}
            fill="none"
            stroke={gateColor}
            strokeWidth="1"
            opacity="0.6"
          />
        ) : (
          // Closed gate: parallel bars
          <>
            <line
              x1={x + 8} y1={cy - 3}
              x2={x + CELL_SIZE - 8} y2={cy - 3}
              stroke={gateColor}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            />
            <line
              x1={x + 8} y1={cy + 3}
              x2={x + CELL_SIZE - 8} y2={cy + 3}
              stroke={gateColor}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            />
          </>
        )
      )}

      {/* Highlight overlay */}
      {isHighlighted && (
        <rect
          x={x + 1}
          y={y + 1}
          width={CELL_SIZE - 2}
          height={CELL_SIZE - 2}
          fill="#FED100"
          opacity="0.5"
          rx="2"
          className="square-highlight"
        />
      )}
    </g>
  );
}
