import { CELL_SIZE } from '@ludi/shared';

/** Jamaican flag X motif center — single square at grid cell (6,6) */
export default function CenterHome() {
  const x = 6 * CELL_SIZE;
  const y = 6 * CELL_SIZE;
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;
  const s = CELL_SIZE;

  // Four triangles within the single cell
  const topTriangle = `M${x},${y} L${x + s},${y} L${cx},${cy} Z`;
  const rightTriangle = `M${x + s},${y} L${x + s},${y + s} L${cx},${cy} Z`;
  const bottomTriangle = `M${x + s},${y + s} L${x},${y + s} L${cx},${cy} Z`;
  const leftTriangle = `M${x},${y + s} L${x},${y} L${cx},${cy} Z`;

  return (
    <g>
      {/* Background fill */}
      <rect x={x} y={y} width={s} height={s} fill="#1a1a1a" rx="1" />

      {/* Jamaican flag quadrants */}
      <path d={topTriangle} fill="#009B3A" opacity="0.9" />
      <path d={bottomTriangle} fill="#009B3A" opacity="0.9" />
      <path d={leftTriangle} fill="#0a0a0a" opacity="0.9" />
      <path d={rightTriangle} fill="#0a0a0a" opacity="0.9" />

      {/* Gold X bands */}
      <line x1={x} y1={y} x2={x + s} y2={y + s} stroke="#FED100" strokeWidth="2.5" opacity="0.9" />
      <line x1={x + s} y1={y} x2={x} y2={y + s} stroke="#FED100" strokeWidth="2.5" opacity="0.9" />

      {/* Center diamond — gold inlay */}
      <polygon
        points={`${cx},${cy - 9} ${cx + 9},${cy} ${cx},${cy + 9} ${cx - 9},${cy}`}
        fill="#FED100"
        opacity="0.95"
      />
      <polygon
        points={`${cx},${cy - 6} ${cx + 6},${cy} ${cx},${cy + 6} ${cx - 6},${cy}`}
        fill="#C4A035"
        opacity="0.4"
      />

      {/* Border */}
      <rect
        x={x}
        y={y}
        width={s}
        height={s}
        fill="none"
        stroke="#3D2B1F"
        strokeWidth="1.5"
      />
    </g>
  );
}
