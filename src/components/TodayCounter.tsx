import { useEffect, useRef, useState } from 'react';

const PARTICLES_TEN = 10;
const PARTICLES_CENTURY = 28;

type Milestone = 'ten' | 'century' | null;

const wait = (duration: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, duration);
});

interface TodayCounterProps {
  count: number;
  paused: boolean;
}

export function TodayCounter({ count, paused }: TodayCounterProps) {
  const [displayedCount, setDisplayedCount] = useState(count);
  const [milestone, setMilestone] = useState<Milestone>(null);
  const displayedRef = useRef(count);
  const targetRef = useRef(count);

  useEffect(() => {
    targetRef.current = count;
  }, [count]);

  useEffect(() => {
    // Enquanto o card está aberto, só o alvo muda. O número visível permanece congelado.
    if (paused) return;

    if (targetRef.current < displayedRef.current) {
      displayedRef.current = targetRef.current;
      setDisplayedCount(targetRef.current);
      setMilestone(null);
      return;
    }

    let cancelled = false;
    const runSequence = async () => {
      while (!cancelled && !paused && displayedRef.current < targetRef.current) {
        const remaining = targetRef.current - displayedRef.current;
        const progressed = 1 - remaining / Math.max(targetRef.current - displayedCount, 1);
        // Curva suave: começa devagar, acelera no meio e desacelera no final.
        const edgeSlowdown = 1 + Math.abs(progressed - 0.5) * 1.5;
        const baseDelay = Math.min(450, Math.max(140, 1800 / Math.max(targetRef.current - displayedCount, 1)));
        await wait(baseDelay * edgeSlowdown);
        if (cancelled || paused) break;

        const next = displayedRef.current + 1;
        displayedRef.current = next;
        setDisplayedCount(next);

        if (cancelled || paused || next % 10 !== 0) continue;
        const nextMilestone: Milestone = next % 100 === 0 ? 'century' : 'ten';
        setMilestone(nextMilestone);
        await wait(nextMilestone === 'century' ? 2600 : 1600);
        if (!cancelled) setMilestone(null);
        await wait(140);
      }
    };

    void runSequence();
    return () => {
      cancelled = true;
    };
  }, [count, paused]);

  const particles = milestone === 'century' ? PARTICLES_CENTURY : PARTICLES_TEN;

  return (
    <div
      className={`relative mb-2 flex items-center justify-center gap-2 overflow-visible rounded-lg border bg-card px-3 py-2 transition-colors duration-500 ${
        milestone === 'century'
          ? 'border-amber-400/70 shadow-[0_0_24px_-4px_hsl(45_95%_55%/0.6)]'
          : milestone === 'ten'
            ? 'border-primary/60 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.5)]'
            : 'border-border'
      }`}
    >
      {milestone && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {Array.from({ length: particles }).map((_, i) => {
            const angle = (i / particles) * 360;
            const distance = milestone === 'century' ? 90 + (i % 4) * 14 : 55 + (i % 3) * 10;
            return (
              <span
                key={i}
                className={milestone === 'century' ? 'milestone-burst-century' : 'milestone-burst-ten'}
                style={
                  {
                    '--angle': `${angle}deg`,
                    '--dist': `${distance}px`,
                    animationDelay: `${(i % 5) * 40}ms`,
                  } as React.CSSProperties
                }
              />
            );
          })}
          {milestone === 'century' && <span className="milestone-ring-century" />}
        </div>
      )}
      <span
        key={`${displayedCount}-${milestone ?? 'idle'}`}
        className={`text-2xl font-bold tabular-nums leading-none ${
          milestone === 'century'
            ? 'milestone-pop-century text-amber-500'
            : milestone === 'ten'
              ? 'milestone-pop-ten text-primary'
              : ''
        }`}
      >
        {displayedCount}
      </span>
      <span className="text-xs text-muted-foreground">
        {milestone === 'century' ? 'centena completa! 🏆' : milestone === 'ten' ? 'dezena completa! 🎯' : 'contatos hoje'}
      </span>
    </div>
  );
}
