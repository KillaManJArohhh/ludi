import { useNavigate } from 'react-router';

const COLOR_DOTS: Record<string, string> = {
  red: '#DC2626',
  green: '#16A34A',
  yellow: '#EAB308',
  blue: '#2563EB',
};

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-full align-middle mx-0.5"
      style={{ backgroundColor: COLOR_DOTS[color], boxShadow: `0 0 6px ${COLOR_DOTS[color]}40` }}
    />
  );
}

export default function Rules() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6 flex justify-center">
      <div className="max-w-2xl w-full pb-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-4xl md:text-5xl font-black tracking-tight mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            <span className="text-gold">How to Play</span>
          </h1>
          <p className="text-[#C4A35A]/60 text-sm tracking-wide">
            Learn the rules of Ludi
          </p>
        </div>

        <div className="space-y-6">
          {/* Overview */}
          <Section title="Overview">
            <p>
              Ludi is a Jamaican board game for 2 or 4 players. Each player has <strong>4 pieces</strong> that
              start in their home base. The goal is to move all 4 pieces around the board and into your{' '}
              <strong>home stretch</strong> before your opponents do.
            </p>
          </Section>

          {/* Board Layout */}
          <Section title="The Board">
            <p>
              The board is a cross-shaped path with <strong>48 squares</strong> forming a circuit loop.
              Each player has:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-2 ml-2 text-[#f0ece4]/80">
              <li>A <strong>home base</strong> (corner) where pieces start</li>
              <li>A <strong>start square</strong> (colored) where pieces enter the circuit</li>
              <li>A <strong>home entry</strong> square leading to your home stretch</li>
              <li>A <strong>home stretch</strong> (5 colored squares) leading to the center</li>
            </ul>
          </Section>

          {/* Colors & Teams */}
          <Section title="Colors & Teams">
            <p className="mb-2">
              <strong>4-player mode:</strong> Each player controls one color &mdash;{' '}
              <ColorDot color="red" /> Red, <ColorDot color="green" /> Green,{' '}
              <ColorDot color="yellow" /> Yellow, or <ColorDot color="blue" /> Blue.
            </p>
            <p>
              <strong>2-player mode:</strong> Each player controls two diagonal colors as a team.
              Player 1 has <ColorDot color="red" /> Red + <ColorDot color="yellow" /> Yellow,
              Player 2 has <ColorDot color="green" /> Green + <ColorDot color="blue" /> Blue.
              Each color takes its own turn in order:{' '}
              <ColorDot color="red" /> &rarr; <ColorDot color="green" /> &rarr;{' '}
              <ColorDot color="yellow" /> &rarr; <ColorDot color="blue" /> &rarr; repeat.
            </p>
          </Section>

          {/* Dice */}
          <Section title="Rolling the Dice">
            <p>You can play with <strong>1 die</strong> or <strong>2 dice</strong>.</p>
            <div className="mt-3 space-y-3">
              <SubSection title="Single Die">
                <ul className="list-disc list-inside space-y-1 ml-2 text-[#f0ece4]/80">
                  <li>Roll a <strong>6</strong> to bring a piece out of base onto your start square</li>
                  <li>Move a piece forward by the number rolled</li>
                  <li>Rolling a <strong>6</strong> grants an extra turn</li>
                </ul>
              </SubSection>
              <SubSection title="Double Dice">
                <ul className="list-disc list-inside space-y-1 ml-2 text-[#f0ece4]/80">
                  <li>Roll at least one <strong>6</strong> to bring a piece out of base</li>
                  <li>Use each die on a different piece, or both on the same piece</li>
                  <li>Non-doubles: you can also add both dice together for one big move</li>
                  <li>Doubles: move a <strong>lock</strong> (pair of same-color pieces on the same square) as a unit</li>
                  <li>Rolling doubles grants an extra turn</li>
                </ul>
              </SubSection>
            </div>
          </Section>

          {/* Movement */}
          <Section title="Movement">
            <ul className="list-disc list-inside space-y-2 ml-2 text-[#f0ece4]/80">
              <li>Pieces move <strong>clockwise</strong> around the 48-square circuit</li>
              <li>After a full lap, pieces turn into their colored <strong>home stretch</strong></li>
              <li>You need an <strong>exact roll</strong> to land on each home stretch square and to reach home</li>
              <li>Pieces <strong>cannot pass</strong> their home entry &mdash; they must turn in</li>
            </ul>
          </Section>

          {/* Capturing */}
          <Section title="Capturing">
            <ul className="list-disc list-inside space-y-2 ml-2 text-[#f0ece4]/80">
              <li>Land on an opponent's single piece to <strong>capture</strong> it &mdash; it goes back to their base</li>
              <li>You <strong>cannot</strong> land on an opponent's <strong>lock</strong> (2+ pieces on one square) with a single piece</li>
              <li>A piece that captures <strong>cannot move again</strong> that turn (no hit-and-run), except when exiting base</li>
            </ul>
          </Section>

          {/* Locks / Blocks */}
          <Section title="Locks (Blocks)">
            <p className="mb-2">
              Two or more of your pieces on the same square form a <strong>lock</strong>.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-[#f0ece4]/80">
              <li>Locks <strong>block</strong> opponents from passing or landing on that square</li>
              <li>On <strong>doubles</strong>, you can move a lock as a unit (both pieces move together)</li>
              <li>A lock moving into opponents <strong>captures all</strong> enemy pieces on that square</li>
            </ul>
          </Section>

          {/* Gates */}
          <Section title="Gates">
            <p>
              Each color has a <strong>gate</strong> at their home entry square. The gate starts <strong>closed</strong>.
              To open it, you must form a lock (2 pieces) on your home entry square. Once opened, the gate
              stays open permanently and your pieces can enter the home stretch.
            </p>
          </Section>

          {/* Special Rules */}
          <Section title="Optional Rules">
            <div className="space-y-3">
              <SubSection title="Lock Kills Lock">
                <p className="text-[#f0ece4]/80 mb-2">
                  When enabled, locks gain the power to destroy other locks:
                </p>
                <ul className="list-disc list-inside space-y-1.5 ml-2 text-[#f0ece4]/80">
                  <li>
                    <strong>Start square break-through:</strong> If an opponent's lock is blocking your
                    start square, rolling <strong>double 6</strong> with at least <strong>2 pieces already
                    home</strong> lets you exit base and capture all their pieces.
                  </li>
                  <li>
                    <strong>Lock vs. lock on the circuit:</strong> Your lock can land on and capture an
                    opponent's lock by rolling the matching double. For example, if an opponent's lock is
                    4 squares ahead, rolling <strong>double 4</strong> moves your lock onto theirs and
                    sends all their pieces back to base.
                  </li>
                </ul>
              </SubSection>
              <SubSection title="Team Sharing (2-Player)">
                <p className="text-[#f0ece4]/80">
                  Teammates can share squares and pass through each other's locks without being blocked.
                  Teammates <strong>cannot</strong> capture each other.
                </p>
              </SubSection>
            </div>
          </Section>

          {/* Winning */}
          <Section title="Winning">
            <p>
              The first player to get <strong>all their pieces home</strong> wins. In 2-player mode, you
              must get all <strong>8 pieces</strong> (both colors) home to win.
            </p>
          </Section>

          {/* Quick Tips */}
          <Section title="Quick Tips">
            <ul className="list-disc list-inside space-y-2 ml-2 text-[#f0ece4]/80">
              <li>Get pieces out of base early &mdash; more pieces on the board means more options</li>
              <li>Form locks to block opponents and protect your pieces</li>
              <li>Open your gate as soon as possible so pieces aren't stuck waiting</li>
              <li>Try to land on opponent start squares to block them from exiting base</li>
              <li>Keep pieces close together for defensive formation</li>
            </ul>
          </Section>
        </div>

        {/* Back button */}
        <div className="mt-10 text-center">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary px-8 py-3 rounded-xl text-[#C4A35A] font-semibold tracking-wide"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-xl p-5 border border-[#C4A35A]/20">
      <h2
        className="text-lg font-bold text-[#FED100] mb-3 tracking-wide"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {title}
      </h2>
      <div className="text-sm text-[#f0ece4]/90 leading-relaxed">{children}</div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pl-3 border-l-2 border-[#C4A35A]/20">
      <h3 className="text-sm font-semibold text-[#C4A35A] mb-1">{title}</h3>
      {children}
    </div>
  );
}
