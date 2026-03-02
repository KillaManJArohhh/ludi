/** Wood texture background pattern and board decorative elements */
export default function BoardBackground() {
  return (
    <>
      <defs>
        {/* Rich mahogany wood pattern */}
        <pattern id="wood-pattern" patternUnits="userSpaceOnUse" width="520" height="520">
          <rect width="520" height="520" fill="#B8943E" />
          {/* Layered grain for depth */}
          {Array.from({ length: 40 }, (_, i) => (
            <line
              key={`grain-${i}`}
              x1={0}
              y1={i * 13.5 + Math.sin(i * 0.7) * 4}
              x2={520}
              y2={i * 13.5 + Math.cos(i * 0.9) * 6}
              stroke="#A8842E"
              strokeWidth={0.4 + (i % 3) * 0.3}
              opacity={0.25 + (i % 4) * 0.05}
            />
          ))}
          {/* Secondary fine grain */}
          {Array.from({ length: 20 }, (_, i) => (
            <line
              key={`fine-${i}`}
              x1={0}
              y1={i * 27 + 8 + Math.sin(i * 1.3) * 3}
              x2={520}
              y2={i * 27 + 8 + Math.cos(i * 1.1) * 5}
              stroke="#C4A445"
              strokeWidth={0.3}
              opacity={0.15}
            />
          ))}
          {/* Subtle knots */}
          <circle cx="145" cy="370" r="10" fill="#9A7A28" opacity="0.08" />
          <circle cx="390" cy="130" r="7" fill="#9A7A28" opacity="0.06" />
          <circle cx="80" cy="160" r="5" fill="#9A7A28" opacity="0.05" />
        </pattern>

        {/* Board inlay border pattern */}
        <linearGradient id="board-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5C3D0E" />
          <stop offset="50%" stopColor="#3D2B1F" />
          <stop offset="100%" stopColor="#5C3D0E" />
        </linearGradient>

        {/* Piece 3D sheen */}
        <radialGradient id="piece-sheen" cx="30%" cy="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="60%" stopColor="white" stopOpacity="0.1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Shadow filter */}
        <filter id="piece-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0.5" dy="1.5" stdDeviation="1.8" floodColor="#000" floodOpacity="0.35" />
        </filter>

        {/* Glow filter for highlights */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Inset shadow for the playing area */}
        <filter id="inset-shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feComponentTransfer in="SourceAlpha">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="3" />
          <feOffset dx="0" dy="1" result="shadow" />
          <feFlood floodColor="#000" floodOpacity="0.15" result="color" />
          <feComposite in2="shadow" operator="in" />
          <feComposite in2="SourceGraphic" operator="over" />
        </filter>
      </defs>

      {/* Full board wood background */}
      <rect
        width="520"
        height="520"
        fill="url(#wood-pattern)"
        rx="10"
      />

      {/* Double border — outer dark, inner gold accent */}
      <rect
        width="520"
        height="520"
        fill="none"
        stroke="url(#board-rim)"
        strokeWidth="4"
        rx="10"
      />
      <rect
        x="3"
        y="3"
        width="514"
        height="514"
        fill="none"
        stroke="#C4A35A"
        strokeWidth="0.5"
        strokeOpacity="0.3"
        rx="8"
      />
    </>
  );
}
