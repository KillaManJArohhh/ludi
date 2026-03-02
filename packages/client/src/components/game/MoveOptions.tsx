import type { MoveOption } from '@ludi/shared';

interface MoveOptionsProps {
  options: MoveOption[];
  onSelect: (option: MoveOption) => void;
}

export default function MoveOptions({ options, onSelect }: MoveOptionsProps) {
  if (options.length <= 1) return null;

  return (
    <div className="glass-panel rounded-lg p-3 max-h-48 overflow-y-auto">
      <p className="text-[11px] text-[#C4A35A]/50 mb-2 font-medium tracking-wide uppercase">
        Choose your move
      </p>
      <div className="flex flex-col gap-1.5">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => onSelect(option)}
            className="text-left px-3 py-2.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08]
                       transition-all text-xs text-[#f0ece4]/80 hover:text-[#f0ece4]
                       border border-white/[0.06] hover:border-[#C4A35A]/20"
          >
            <span>{option.description}</span>
            {option.moves.some(m => m.isCapture) && (
              <span className="ml-2 text-red-400 font-bold text-[10px] tracking-wide">CAPTURE</span>
            )}
            {option.moves.some(m => m.to.state === 'home') && (
              <span className="ml-2 text-[#FED100] font-bold text-[10px] tracking-wide">HOME</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
