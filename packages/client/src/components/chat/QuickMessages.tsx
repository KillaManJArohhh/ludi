import { JAMAICAN_PHRASES } from '@ludi/shared';

interface QuickMessagesProps {
  onSelect: (text: string) => void;
}

export default function QuickMessages({ onSelect }: QuickMessagesProps) {
  return (
    <div className="flex gap-1 px-2 py-1.5 overflow-x-auto border-t border-[#C4A35A]/10">
      {JAMAICAN_PHRASES.map(phrase => (
        <button
          key={phrase}
          onClick={() => onSelect(phrase)}
          className="flex-shrink-0 px-2 py-1 rounded bg-[#FED100]/[0.08] text-[#FED100]/60
                     text-[10px] hover:bg-[#FED100]/[0.15] hover:text-[#FED100]/80
                     transition-colors whitespace-nowrap border border-[#FED100]/[0.06]"
        >
          {phrase}
        </button>
      ))}
    </div>
  );
}
