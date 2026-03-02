import { useState, useEffect } from 'react';

interface DieProps {
  value: number | null;
  rolling: boolean;
  used?: boolean;
  size?: number;
}

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
};

export default function Die({ value, rolling, used, size = 58 }: DieProps) {
  const [displayValue, setDisplayValue] = useState(value || 1);

  useEffect(() => {
    if (rolling) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 70);
      return () => clearInterval(interval);
    }
    if (value) setDisplayValue(value);
  }, [rolling, value]);

  const dots = DOT_POSITIONS[displayValue] || [];

  return (
    <div
      className={`relative inline-block ${rolling ? 'dice-rolling' : ''}`}
      style={{ width: size, height: size, opacity: used ? 0.25 : 1, transition: 'opacity 0.3s ease' }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {/* Die shadow */}
        <rect
          x="8"
          y="10"
          width="88"
          height="88"
          rx="14"
          fill="rgba(0,0,0,0.25)"
        />
        {/* Die body — warm ivory */}
        <rect
          x="5"
          y="5"
          width="90"
          height="90"
          rx="14"
          fill="#FFF8E7"
        />
        {/* Top-left highlight */}
        <rect
          x="8"
          y="8"
          width="84"
          height="40"
          rx="10"
          fill="white"
          opacity="0.15"
        />
        {/* Border */}
        <rect
          x="5"
          y="5"
          width="90"
          height="90"
          rx="14"
          fill="none"
          stroke="#A0906C"
          strokeWidth="1.5"
        />
        {/* Dots */}
        {dots.map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="8.5" fill="#1a1a1a" />
            <circle cx={cx - 1.5} cy={cy - 1.5} r="2" fill="white" opacity="0.15" />
          </g>
        ))}
      </svg>
    </div>
  );
}
