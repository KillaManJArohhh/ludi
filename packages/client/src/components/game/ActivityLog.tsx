import type { Color } from '@ludi/shared';
import { COLOR_HEX } from '@ludi/shared';

export interface ActivityEntry {
  id: number;
  playerName: string;
  color: Color;
  text: string;
  type: 'roll' | 'move' | 'capture' | 'home' | 'pass';
}

interface ActivityLogProps {
  entries: ActivityEntry[];
}

function getIcon(type: ActivityEntry['type']) {
  switch (type) {
    case 'roll':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'capture':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M7 7l10 10M17 7l-10 10" />
        </svg>
      );
    case 'home':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12l9-9 9 9" />
          <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      );
    case 'pass':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M13 5l7 7-7 7" />
          <path d="M4 12h16" />
        </svg>
      );
    default: // move
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M12 5v2M12 17v2" />
        </svg>
      );
  }
}

export default function ActivityLog({ entries }: ActivityLogProps) {
  if (entries.length === 0) return null;

  return (
    <div className="w-full max-w-[540px]">
      <div className="flex flex-col items-center gap-1">
        {entries.map((entry, i) => {
          const hex = COLOR_HEX[entry.color];
          const isLatest = i === entries.length - 1;
          return (
            <div
              key={entry.id}
              className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-opacity duration-300
                ${isLatest ? 'opacity-100' : 'opacity-50'}`}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: hex, boxShadow: `0 0 6px ${hex}50` }}
              />
              <span className="flex-shrink-0" style={{ color: isLatest ? `${hex}cc` : '#C4A35A66' }}>
                {getIcon(entry.type)}
              </span>
              <span
                className={`text-[11px] font-medium truncate ${isLatest ? 'text-[#f0ece4]/90' : 'text-[#f0ece4]/50'}`}
              >
                <span style={{ color: isLatest ? hex : undefined }} className="font-semibold">
                  {entry.playerName}
                </span>
                {' '}{entry.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
