import { CELL_SIZE, HOME_STRETCH_POSITIONS, COLOR_HEX, COLOR_LIGHT, COLOR_DARK } from '@ludi/shared';
import type { Color } from '@ludi/shared';

interface HomeStretchProps {
  color: Color;
}

/** Colored home stretch column leading to center */
export default function HomeStretch({ color }: HomeStretchProps) {
  const positions = HOME_STRETCH_POSITIONS[color];
  const hex = COLOR_HEX[color];
  const light = COLOR_LIGHT[color];
  const dark = COLOR_DARK[color];

  return (
    <g>
      {positions.map((pos, i) => {
        const x = pos.col * CELL_SIZE;
        const y = pos.row * CELL_SIZE;
        const progress = (i + 1) / positions.length;

        return (
          <g key={`home-stretch-${color}-${i}`}>
            {/* Main square with increasing intensity toward center */}
            <rect
              x={x + 1}
              y={y + 1}
              width={CELL_SIZE - 2}
              height={CELL_SIZE - 2}
              fill={hex}
              opacity={0.5 + progress * 0.3}
              rx="2"
            />
            {/* Inner highlight */}
            <rect
              x={x + 4}
              y={y + 4}
              width={CELL_SIZE - 8}
              height={CELL_SIZE - 8}
              fill={light}
              opacity={0.15 + progress * 0.15}
              rx="1"
            />
            {/* Step number — small, subtle */}
            <text
              x={x + CELL_SIZE / 2}
              y={y + CELL_SIZE / 2 + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="7"
              fill="#fff"
              opacity={0.5}
              fontWeight="600"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}
