import { ABILITIES, type AbilityId } from '../game/data';
import {
  Sparkles, Split, Hammer, Zap, Snowflake, Copy, MoveRight,
  Star, Target, Bomb, MoveUp, Flame,
} from 'lucide-react';

const ICONS: Record<string, any> = {
  sparkle: Sparkles, scatter: Split, hammer: Hammer, zap: Zap, snow: Snowflake,
  double: Copy, arrow: MoveRight, star: Star, target: Target, boom: Bomb,
  jump: MoveUp, flame: Flame,
};

/** Small readable ability tags */
export function AbilityChips({ ids, compact = false }: { ids: AbilityId[]; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((a) => {
        const ab = ABILITIES[a];
        const Icon = ICONS[ab.icon] || Sparkles;
        return (
          <span
            key={a}
            className={`inline-flex items-center gap-1 rounded-full font-display font-extrabold ring-1 ring-black/25 ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
            style={{ background: ab.tint, color: '#241a3d' }}
          >
            <Icon className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            {ab.label}
          </span>
        );
      })}
    </div>
  );
}

/** Tiny normalized stat bar */
export function StatBar({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-9 shrink-0 text-[9px] font-extrabold tracking-wider opacity-70">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/25">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, value * 100)}%`, background: tint }} />
      </span>
    </div>
  );
}
