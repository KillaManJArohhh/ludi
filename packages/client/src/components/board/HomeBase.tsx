import { CELL_SIZE, BASE_POSITIONS, COLOR_HEX, COLOR_LIGHT, COLOR_DARK } from '@ludi/shared';
import type { Color, Piece } from '@ludi/shared';
import { gridToSvg } from '@ludi/shared';

interface HomeBaseProps {
  color: Color;
  pieces: Piece[]; // pieces still in base
}

/** Corner base area where pieces start */
export default function HomeBase({ color, pieces }: HomeBaseProps) {
  const positions = BASE_POSITIONS[color];
  const hex = COLOR_HEX[color];
  const light = COLOR_LIGHT[color];
  const dark = COLOR_DARK[color];

  // Determine bounding box for base area
  const minRow = Math.min(...positions.map(p => p.row)) - 0.5;
  const maxRow = Math.max(...positions.map(p => p.row)) + 0.5;
  const minCol = Math.min(...positions.map(p => p.col)) - 0.5;
  const maxCol = Math.max(...positions.map(p => p.col)) + 0.5;

  const x = minCol * CELL_SIZE;
  const y = minRow * CELL_SIZE;
  const w = (maxCol - minCol + 1) * CELL_SIZE;
  const h = (maxRow - minRow + 1) * CELL_SIZE;

  return (
    <g>
      {/* Outer border shadow */}
      <rect
        x={x + 1}
        y={y + 1}
        width={w}
        height={h}
        fill="rgba(0,0,0,0.2)"
        rx="8"
      />

      {/* Base background — dark with color tint */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={dark}
        rx="8"
        opacity="0.85"
      />

      {/* Inner fill with color wash */}
      <rect
        x={x + 3}
        y={y + 3}
        width={w - 6}
        height={h - 6}
        fill={hex}
        rx="5"
        opacity="0.15"
      />

      {/* Thin gold inlay border */}
      <rect
        x={x + 3}
        y={y + 3}
        width={w - 6}
        height={h - 6}
        fill="none"
        stroke={hex}
        strokeWidth="0.5"
        strokeOpacity="0.3"
        rx="5"
      />

      {/* Piece slots */}
      {positions.map((pos, i) => {
        const svg = gridToSvg(pos);
        return (
          <g key={`base-slot-${color}-${i}`}>
            {/* Slot depression */}
            <circle
              cx={svg.x}
              cy={svg.y}
              r={13}
              fill={dark}
              opacity="0.6"
            />
            {/* Slot ring */}
            <circle
              cx={svg.x}
              cy={svg.y}
              r={11}
              fill="none"
              stroke={light}
              strokeWidth="1"
              opacity="0.25"
            />
            {/* Inner depression */}
            <circle
              cx={svg.x}
              cy={svg.y}
              r={9}
              fill={hex}
              opacity="0.08"
            />
          </g>
        );
      })}
    </g>
  );
}
