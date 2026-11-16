import { useState, type CSSProperties } from 'react';
import {
  Flame, Zap, Copy, Hammer, Magnet, Heart, Wind, Clover, Ghost, Gem, Check,
  type LucideIcon,
} from 'lucide-react';
import type { Offer } from '../game/engine';
import type { UpgradeId } from '../game/data';

const visuals: Record<UpgradeId, { icon: LucideIcon; from: string; to: string }> = {
  damage: { icon: Flame, from: '#ff8b21', to: '#ff385b' },
  firerate: { icon: Zap, from: '#ffca08', to: '#ff7900' },
  multishot: { icon: Copy, from: '#e875ff', to: '#9b13ff' },
  knock: { icon: Hammer, from: '#ffa5bd', to: '#ed1875' },
  magnet: { icon: Magnet, from: '#57e8fc', to: '#00a5e4' },
  maxhp: { icon: Heart, from: '#65edb1', to: '#00b158' },
  speed: { icon: Wind, from: '#ccf841', to: '#00b683' },
  crit: { icon: Clover, from: '#fff186', to: '#ffae05' },
  pierce: { icon: Ghost, from: '#b39aff', to: '#5037fa' },
};

export default function PowerUpCard({
  offer, gems, onBuy,
}: { offer: Offer; gems: number; onBuy: (id: UpgradeId) => void }) {
  const [purchase, setPurchase] = useState(0);
  const { icon: Icon, from, to } = visuals[offer.id];
  const maxed = offer.level >= offer.max;
  const affordable = gems >= offer.cost;

  return (
    <article
      className="power-up"
      data-upgrade={offer.id}
      style={{ '--power-from': from, '--power-to': to } as CSSProperties}
      aria-label={`${offer.name}, level ${offer.level} of ${offer.max}`}
    >
      <div className="power-up__heading">
        <span className="power-up__icon"><Icon size={25} strokeWidth={2} /></span>
        <div className="power-up__name">
          <h3>{offer.name}</h3>
          <span className="power-up__bonus">{offer.tag}</span>
        </div>
        <span className="power-up__level">{offer.level}/{offer.max}</span>
      </div>
      <div
        key={purchase}
        className={`power-up__progress${purchase ? ' power-up__progress--bump' : ''}`}
        aria-label={`${offer.level} of ${offer.max} upgrades purchased`}
      >
        {Array.from({ length: offer.max }, (_, index) => (
          <span key={index} className={index < offer.level ? 'is-filled' : ''} />
        ))}
      </div>
      <button
        type="button"
        className="power-up__buy"
        disabled={!affordable || maxed}
        onClick={() => { onBuy(offer.id); setPurchase(value => value + 1); }}
        aria-label={maxed ? `${offer.name} fully upgraded` : `Upgrade ${offer.name} for ${offer.cost} gems`}
        title={maxed ? 'Fully upgraded' : affordable ? `Buy ${offer.name}` : `You need ${offer.cost - gems} more gems`}
      >
        {maxed ? <><Check size={19} /> MAX</> : <><Gem size={19} strokeWidth={1.8} /> {offer.cost}</>}
      </button>
    </article>
  );
}