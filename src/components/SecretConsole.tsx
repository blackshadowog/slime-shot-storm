import { useEffect, useRef, useState } from 'react';
import { Skull, Crown, Gem, Heart, Zap, ShieldAlert, ArrowRight, Trophy, X, Power } from 'lucide-react';
import { audio } from '../game/audio';

export type AdminKind = 'gems' | 'heal' | 'killall' | 'skip' | 'maxup' | 'unlock';

interface Props {
  open: boolean;
  god: boolean;
  onClose: () => void;
  onGrant: () => void;
  onAdmin: (kind: AdminKind) => void;
  onToggleGod: (on: boolean) => void;
}

const PASSPHRASE = 'blackshadow';

export default function SecretConsole({ open, god, onClose, onGrant, onAdmin, onToggleGod }: Props) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'wrong' | 'granted'>('idle');
  const [tries, setTries] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue('');
    setStatus(god ? 'granted' : 'idle');
    setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, god, onClose]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (god) return;
    if (value.trim().toLowerCase() === PASSPHRASE) {
      setStatus('granted');
      onGrant();
    } else {
      setStatus('wrong');
      setTries((t) => t + 1);
      setShakeKey((k) => k + 1);
      audio.deny2();
      setValue('');
    }
  };

  const admin = (k: AdminKind) => { audio.admin(); onAdmin(k); };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0d0718]/88 p-4 backdrop-blur-md">
      <div
        key={shakeKey}
        className={`scanlines relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-[#170d2b] p-5 ring-4 sm:p-7 ${status === 'wrong' ? 'animate-shake-x ring-rose-500' : 'ring-fuchsia-500/70'}`}
        style={{ boxShadow: '0 24px 70px rgba(190,60,255,.28), inset 0 0 60px rgba(120,40,200,.35)' }}
      >
        {/* corner bolts */}
        {[[ 'left-3 top-3'], ['right-3 top-3'], ['left-3 bottom-3'], ['right-3 bottom-3']].map(([c], i) => (
          <span key={i} className={`absolute ${c} h-2.5 w-2.5 rounded-full bg-fuchsia-300/50 ring-1 ring-fuchsia-200/40`} />
        ))}

        <button onClick={onClose} className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-2 ${god ? 'bg-lime-300 text-[#170d2b] ring-lime-200' : 'bg-fuchsia-500 text-white ring-fuchsia-300'}`}>
            {god ? <Crown className="h-6 w-6" /> : <Skull className="h-6 w-6" />}
          </div>
          <div>
            <div className="font-display text-2xl font-extrabold leading-none text-fuchsia-200 glitch-text">SHADOW TERMINAL</div>
            <div className="font-mono text-[11px] tracking-widest text-lime-300/80">
              {god ? 'SESSION: IMMORTAL' : 'SESSION: LOCKED'}
            </div>
          </div>
        </div>

        {!god ? (
          <form onSubmit={submit} className="mt-5">
            <label className="font-mono text-[11px] tracking-widest text-fuchsia-300/70" htmlFor="shadowcode">
              &gt; ENTER PASSPHRASE
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-black/50 px-4 py-3 ring-2 ring-fuchsia-500/40 focus-within:ring-lime-300/70">
              <ArrowRight className="h-4 w-4 shrink-0 text-lime-300" />
              <input
                id="shadowcode"
                ref={inputRef}
                value={value}
                onChange={(e) => { setValue(e.target.value); audio.tick(); }}
                autoComplete="off"
                spellCheck={false}
                placeholder="•••••••••••"
                className="w-full bg-transparent font-mono text-lg tracking-[0.25em] text-lime-200 outline-none placeholder:text-fuchsia-400/30"
              />
            </div>
            <button
              type="submit"
              className="mt-3 w-full rounded-2xl bg-gradient-to-b from-fuchsia-400 to-fuchsia-600 py-3 font-display text-lg font-extrabold text-white ring-2 ring-fuchsia-200/60 transition-transform hover:scale-[1.02] active:translate-y-0.5"
            >
              EXECUTE
            </button>
            <div className="mt-3 min-h-[20px] text-center font-mono text-xs">
              {status === 'wrong' && (
                <span className="text-rose-400">ACCESS DENIED {tries > 1 ? `(${tries} tries)` : ''}</span>
              )}
              {tries >= 3 && status === 'wrong' && (
                <span className="ml-2 text-fuchsia-300/80">hint: dark + shade, one word</span>
              )}
              {status === 'idle' && <span className="text-fuchsia-300/50 caret-blink">awaiting input_</span>}
            </div>
          </form>
        ) : (
          <div className="mt-5">
            <div className="rounded-2xl bg-lime-300/15 p-3 ring-2 ring-lime-300/50">
              <div className="font-display text-lg font-extrabold leading-none text-lime-300">ACCESS GRANTED</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[10px] tracking-wider text-lime-200/85">
                <span className="rounded-full bg-black/35 px-2 py-0.5">IMMORTAL</span>
                <span className="rounded-full bg-black/35 px-2 py-0.5">ALL 100 LEVELS</span>
                <span className="rounded-full bg-black/35 px-2 py-0.5">ALL GUNS</span>
                <span className="rounded-full bg-black/35 px-2 py-0.5">MAX UPGRADES</span>
                <span className="rounded-full bg-black/35 px-2 py-0.5">x40 DAMAGE</span>
              </div>
            </div>

            <div className="mt-3 font-mono text-[11px] tracking-widest text-fuchsia-300/70">&gt; ADMIN CONTROLS</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([
                { k: 'gems', label: '+5000 GEMS', icon: Gem, tint: 'from-cyan-300 to-sky-500' },
                { k: 'heal', label: 'FULL HEAL', icon: Heart, tint: 'from-emerald-300 to-green-500' },
                { k: 'killall', label: 'POP ALL', icon: Skull, tint: 'from-rose-300 to-pink-600' },
                { k: 'skip', label: 'SKIP WAVE', icon: Zap, tint: 'from-amber-200 to-orange-500' },
                { k: 'maxup', label: 'MAX STATS', icon: Trophy, tint: 'from-violet-300 to-fuchsia-600' },
                { k: 'unlock', label: 'UNLOCK ALL', icon: ShieldAlert, tint: 'from-lime-200 to-emerald-500' },
              ] as { k: AdminKind; label: string; icon: any; tint: string }[]).map((b) => (
                <button
                  key={b.k}
                  onClick={() => admin(b.k)}
                  className={`flex items-center gap-2 rounded-2xl bg-gradient-to-br ${b.tint} px-3 py-2.5 font-display text-sm font-extrabold text-[#170d2b] ring-2 ring-black/30 transition-transform hover:scale-[1.03] active:translate-y-0.5`}
                >
                  <b.icon className="h-4 w-4" /> {b.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => { audio.denied(); onToggleGod(false); setStatus('idle'); }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-2.5 font-display text-sm font-extrabold text-white/80 ring-2 ring-white/20 hover:bg-white/20"
            >
              <Power className="h-4 w-4" /> GIVE UP POWER
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
