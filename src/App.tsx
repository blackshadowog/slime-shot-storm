import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Heart, Wind, Trophy, Skull, RotateCcw, Home, Volume2, VolumeX, Music,
  MousePointer2, ChevronRight, Crosshair, Crown,
  Timer, Target, Move, Pause, Zap,
  Lock, Infinity as InfinityIcon, Map as MapIcon, ArrowLeft, X, Check,
} from 'lucide-react';
import {
  GameEngine, loadBest, loadProgress,
  type HudState, type Phase, type RunStats, type ShopPayload, type Mode,
} from './game/engine';
import { audio } from './game/audio';
import { GUNS, LEVELS, LEVEL_COUNT, THEMES, WORLDS, type UpgradeId } from './game/data';
import { AbilityChips, StatBar } from './components/WeaponDetails';
import SecretConsole, { type AdminKind } from './components/SecretConsole';
import { GemIcon, DiceIcon, HealIcon, ShopIcon } from './components/Icons';
import DevBadge from './components/DevBadge';
import PowerUpCard from './components/PowerUpCard';
import WeaponImage from './components/WeaponImage';
import GameLogo from './components/GameLogo';

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const lastRun = useRef<{ mode: Mode; lvl: number }>({ mode: 'infinite', lvl: 0 });
  const tabHeld = useRef(false);
  const wasPlaying = useRef(false);

  const [phase, setPhase] = useState<Phase>('menu');
  const [mapOpen, setMapOpen] = useState(false);
  const [mapWorld, setMapWorld] = useState(0);
  const [hud, setHud] = useState<HudState | null>(null);
  const [weaponPreviews, setWeaponPreviews] = useState<Record<string, string>>({});
  const [shopTab, setShopTab] = useState<'powerups' | 'guns'>('powerups');
  const [banner, setBanner] = useState<{ title: string; sub: string; color: string; key: number } | null>(null);
  const [shop, setShop] = useState<ShopPayload | null>(null);
  const [hitmark, setHitmark] = useState<{ kill: boolean; key: number } | null>(null);
  const [hurtKey, setHurtKey] = useState(0);
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [sens, setSens] = useState(0.0023);
  const [runStats, setRunStats] = useState<RunStats | null>(null);
  const [best, setBest] = useState(loadBest());
  const [progress, setProgress] = useState(loadProgress());
  const [gemBump, setGemBump] = useState(0);
  const [secretOpen, setSecretOpen] = useState(false);
  const prevGems = useRef(0);
  const isTouch = useRef(typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  useEffect(() => {
    if (!canvasRef.current || engineRef.current) return;
    const engine = new GameEngine(canvasRef.current, {
      onWeaponPreviews: setWeaponPreviews,
      onHud: (h) => {
        setHud(h);
        if (h.gems !== prevGems.current) {
          if (h.gems > prevGems.current) setGemBump((k) => k + 1);
          prevGems.current = h.gems;
        }
      },
      onPhase: (p) => {
        setPhase(p);
        if (p === 'shop') setShopTab('powerups');
        if (p === 'menu') { setBest(loadBest()); setProgress(loadProgress()); setMapOpen(false); }
      },
      onBanner: (title, sub, color) => setBanner({ title, sub, color: color || '#67eb7a', key: Date.now() + Math.random() }),
      onHurt: () => setHurtKey((k) => k + 1),
      onHitmarker: (kill) => setHitmark({ kill, key: Date.now() + Math.random() }),
      onGameOver: (s) => { setRunStats(s); setBest(loadBest()); setProgress(loadProgress()); },
      onShop: (p) => { setShop(p); setProgress(loadProgress()); },
    });
    engine.init();
    engineRef.current = engine;
    return () => { engine.dispose(); engineRef.current = null; };
  }, []);

  /* --- first gesture wakes audio + menu music --- */
  useEffect(() => {
    const wake = () => {
      audio.ensure();
      if (engineRef.current && (engineRef.current as any).phase === 'menu') audio.setTrack('menu');
    };
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('keydown', wake, { once: true });
    return () => { window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake); };
  }, []);

  /* --- TAB + 9 → shadow terminal --- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        tabHeld.current = true;
      } else if (e.code === 'Digit9' && tabHeld.current) {
        e.preventDefault();
        const eng = engineRef.current;
        if (!eng) return;
        wasPlaying.current = (eng as any).phase === 'playing';
        if (wasPlaying.current) eng.exitLock();
        audio.ensure();
        audio.unlock();
        setSecretOpen(true);
      }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Tab') tabHeld.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const closeSecret = useCallback(() => {
    setSecretOpen(false);
    setProgress(loadProgress());
    if (wasPlaying.current) setTimeout(() => engineRef.current?.resume(), 30);
    wasPlaying.current = false;
  }, []);

  const startRun = useCallback((mode: Mode, lvl = 0) => {
    audio.ensure(); audio.click();
    lastRun.current = { mode, lvl };
    setRunStats(null); setShop(null); setBanner(null); setMapOpen(false);
    engineRef.current?.startRun(mode, lvl);
    setTimeout(() => engineRef.current?.requestLock(), 30);
  }, []);

  const retry = useCallback(() => startRun(lastRun.current.mode, lastRun.current.lvl), [startRun]);
  const openMenuShop = useCallback(() => { audio.ensure(); engineRef.current?.openMenuShop(); }, []);

  const nextStage = useCallback(() => {
    audio.click();
    const isMenuShop = shop?.kind === 'menu';
    setShop(null);
    engineRef.current?.continueFromShop();
    if (!isMenuShop) setTimeout(() => engineRef.current?.requestLock(), 30);
  }, [shop]);

  const resume = useCallback(() => { audio.click(); engineRef.current?.resume(); }, []);
  const toMenu = useCallback(() => { audio.click(); setRunStats(null); setShop(null); engineRef.current?.quitToMenu(); }, []);

  const toggleMute = useCallback(() => setMuted((m) => { audio.setMuted(!m); return !m; }), []);
  const toggleMusic = useCallback(() => setMusicOn((m) => { audio.setMusicEnabled(!m); return !m; }), []);
  const onSens = useCallback((v: number) => { setSens(v); engineRef.current?.setSensitivity(v); }, []);
  const lockIfNeeded = useCallback(() => {
    if (phase === 'playing' || phase === 'paused') engineRef.current?.requestLock();
  }, [phase]);

  const buyUp = useCallback((id: UpgradeId) => engineRef.current?.buyUpgrade(id), []);
  const buyGun = useCallback((id: string) => engineRef.current?.buyGun(id), []);
  const heal = useCallback(() => engineRef.current?.healShop(), []);
  const reroll = useCallback(() => engineRef.current?.reroll(), []);

  const hudHpPct = hud ? Math.max(0, (hud.hp / hud.maxHp) * 100) : 100;
  const cleared = progress.cleared;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#99d9ff]">
      <canvas ref={canvasRef} onClick={lockIfNeeded} className="absolute inset-0 h-full w-full" />

      {/* ================= HUD ================= */}
      {(phase === 'playing' || phase === 'paused') && hud && (
        <div className="pointer-events-none absolute inset-0">
          <div key={hurtKey} className={`absolute inset-0 ${hurtKey > 0 ? 'animate-damage' : ''}`}>
            <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 110px 36px rgba(255,40,70,0.52)', opacity: hurtKey ? 1 : 0, transition: 'opacity .35s' }} />
          </div>
          {hudHpPct < 30 && !hud.god && <div className="absolute inset-0 animate-pulse" style={{ boxShadow: 'inset 0 0 130px 26px rgba(255,0,50,0.48)' }} />}
          {hud.god && <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 150px 30px rgba(255,214,90,0.28)' }} />}

          <div className="absolute left-3 top-3 w-52 sm:left-5 sm:top-5 sm:w-64">
            <div className="flex items-center gap-2">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-[0_4px_0_rgba(30,20,60,.85)] ring-2 ring-[#1e143c] ${hud.god ? 'bg-amber-300' : 'bg-rose-500'}`}>
                {hud.god ? <Crown className="h-5 w-5 text-[#1e143c]" /> : <Heart className="h-5 w-5 fill-white text-white" />}
              </div>
              <div className="flex-1">
                <div className="relative h-5 overflow-hidden rounded-full bg-[#1e143c]/65 ring-2 ring-[#1e143c]">
                  <div className={`h-full rounded-full transition-all duration-200 ${hud.god ? 'bg-gradient-to-r from-amber-200 to-yellow-400' : hudHpPct > 50 ? 'bg-gradient-to-r from-lime-300 to-emerald-400' : hudHpPct > 25 ? 'bg-gradient-to-r from-amber-300 to-orange-400' : 'bg-gradient-to-r from-rose-400 to-red-500'}`} style={{ width: `${hudHpPct}%` }} />
                  <span className="font-display absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white text-stroke-sm">
                    {hud.god ? '∞' : `${hud.hp}/${hud.maxHp}`}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Wind className="h-3.5 w-3.5 text-cyan-100 drop-shadow" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1e143c]/50 ring-1 ring-[#1e143c]/60">
                    <div className={`h-full rounded-full ${hud.dashT <= 0 ? 'bg-cyan-300' : 'bg-cyan-300/40'}`} style={{ width: `${hud.dashT <= 0 ? 100 : Math.max(0, 100 - (hud.dashT / hud.dashMax) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 flex-col items-center gap-1.5 sm:top-5">
            <div className="flex items-center gap-2 rounded-full bg-[#1e143c]/80 px-4 py-1.5 ring-2 ring-white/25 backdrop-blur-md">
              {hud.mode === 'levels'
                ? <span className="font-display text-sm font-extrabold text-amber-200">{hud.levelNo}/{LEVEL_COUNT}</span>
                : <InfinityIcon className="h-4 w-4 text-fuchsia-300" />}
              <span className="font-display text-sm font-extrabold text-white">
                {hud.mode === 'levels' ? `W ${hud.waveNo}/${hud.waveTotal}` : `W ${hud.waveNo}`}
              </span>
              <span className="h-3.5 w-[2px] rounded-full bg-white/20" />
              <span className="flex items-center gap-1 font-display text-sm font-extrabold text-lime-300"><Skull className="h-3.5 w-3.5" />{hud.alive}</span>
            </div>
            {hud.boss && (
              <div className="w-64 sm:w-80">
                <div className="h-4 overflow-hidden rounded-full bg-[#1e143c]/75 ring-2 ring-white/30">
                  <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-500 transition-all" style={{ width: `${Math.max(0, (hud.boss.hp / hud.boss.max) * 100)}%` }} />
                </div>
              </div>
            )}
            {hud.combo >= 2 && (
              <div key={hud.combo} className="animate-combo rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 px-3.5 py-0.5 font-display text-sm font-extrabold text-white shadow-lg ring-2 ring-white/50">{hud.combo}x</div>
            )}
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-5 sm:top-5">
            {hud.god && (
              <span className="god-pill flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-200 to-fuchsia-400 px-3 py-1.5 font-display text-xs font-extrabold text-[#1e143c] ring-2 ring-[#1e143c]">
                <Crown className="h-3.5 w-3.5" /> GOD
              </span>
            )}
            <div className="hidden items-center gap-1.5 rounded-full bg-[#1e143c]/75 px-3 py-1.5 font-display text-sm font-extrabold text-amber-200 ring-2 ring-white/20 sm:flex">
              <Trophy className="h-3.5 w-3.5" />{hud.score.toLocaleString()}
            </div>
            <div key={gemBump} className="animate-gem-bump flex items-center gap-1.5 rounded-full bg-[#1e143c]/85 px-3.5 py-1.5 ring-2 ring-cyan-300/50">
              <GemIcon className="h-4 w-4 text-cyan-300" /><span className="font-display text-base font-extrabold text-cyan-100">{hud.gems}</span>
            </div>
            <button onClick={toggleMusic} className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#1e143c]/85 text-white ring-2 ring-white/25 hover:bg-[#2c2058]">
              <Music className={`h-4 w-4 ${musicOn ? '' : 'opacity-40'}`} />
            </button>
            <button onClick={toggleMute} className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#1e143c]/85 text-white ring-2 ring-white/25 hover:bg-[#2c2058]">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-11 w-11 items-center justify-center">
              <div className="absolute h-4 w-[3px] -translate-y-3 rounded-full bg-white/95 shadow-[0_0_5px_rgba(0,0,0,.7)]" />
              <div className="absolute h-4 w-[3px] translate-y-3 rounded-full bg-white/95 shadow-[0_0_5px_rgba(0,0,0,.7)]" />
              <div className="absolute h-[3px] w-4 -translate-x-3 rounded-full bg-white/95 shadow-[0_0_5px_rgba(0,0,0,.7)]" />
              <div className="absolute h-[3px] w-4 translate-x-3 rounded-full bg-white/95 shadow-[0_0_5px_rgba(0,0,0,.7)]" />
              <div className="crosshair-dot h-1.5 w-1.5 rounded-full bg-white" />
            </div>
            {hitmark && (
              <div key={hitmark.key} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className={`font-black ${hitmark.kill ? 'text-4xl text-rose-400' : 'text-2xl text-white'}`} style={{ animation: 'hitmark .28s ease-out both', textShadow: '0 0 8px rgba(0,0,0,.75)' }}>✕</div>
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-1.5 rounded-full bg-[#1e143c]/75 p-1.5 ring-2 ring-white/20 backdrop-blur-md">
            {hud.owned.map((id, i) => {
              const g = GUNS.find((x) => x.id === id)!;
              const active = id === hud.gunId;
              return (
                <button
                  key={id}
                  onClick={() => engineRef.current?.equipGun(id)}
                  aria-label={`Equip ${g.name}`}
                  aria-pressed={active}
                  title={`${i + 1}: ${g.name}`}
                  className={`weapon-hotbar-button flex flex-col items-center justify-center transition-transform ${active ? '-translate-y-1.5 scale-105 bg-white text-[#1e143c] shadow-[0_4px_0_rgba(30,20,60,.8)] ring-2 ring-[#1e143c]' : 'bg-white/10 text-white'}`}
                >
                  <WeaponImage id={g.id} src={weaponPreviews[g.id]} decorative />
                  <span className="text-[9px] font-extrabold opacity-75">{i + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {banner && (phase === 'playing' || phase === 'shop') && (
        <div key={banner.key} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-banner text-center">
            <div className="font-display text-6xl font-extrabold tracking-tight text-stroke sm:text-7xl" style={{ color: banner.color }}>{banner.title}</div>
            {banner.sub && <div className="font-display mt-1 text-2xl font-extrabold text-white text-stroke-sm">{banner.sub}</div>}
          </div>
        </div>
      )}

      {/* ================= MENU ================= */}
      {phase === 'menu' && !secretOpen && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
          <div className="pointer-events-auto flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-[#1e143c]/85 px-4 py-2 font-display text-base font-extrabold text-cyan-200 ring-2 ring-white/30 backdrop-blur-md">
                <GemIcon className="h-4 w-4 text-cyan-300" />{hud?.gems ?? 0}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-[#1e143c]/80 px-3.5 py-2 font-display text-sm font-extrabold text-lime-200 ring-2 ring-white/25 backdrop-blur-md">
                <MapIcon className="h-4 w-4" />{cleared}/{LEVEL_COUNT}
              </div>
              {best.wave > 0 && (
                <div className="hidden items-center gap-1.5 rounded-full bg-[#1e143c]/80 px-3.5 py-2 font-display text-sm font-extrabold text-amber-200 ring-2 ring-white/25 backdrop-blur-md sm:flex">
                  <Trophy className="h-4 w-4" />W{best.wave}
                </div>
              )}
              {hud?.god && (
                <span className="god-pill flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-200 to-fuchsia-400 px-3 py-2 font-display text-xs font-extrabold text-[#1e143c] ring-2 ring-[#1e143c]">
                  <Crown className="h-3.5 w-3.5" />GOD MODE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleMusic} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1e143c]/85 text-white ring-2 ring-white/30 backdrop-blur-md hover:scale-105">
                <Music className={`h-5 w-5 ${musicOn ? '' : 'opacity-40'}`} />
              </button>
              <button onClick={toggleMute} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1e143c]/85 text-white ring-2 ring-white/30 backdrop-blur-md hover:scale-105">
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {!mapOpen ? (
            <div className="pointer-events-auto mx-auto my-auto flex flex-col items-center text-center">
              <GameLogo />

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                <button onClick={() => { audio.ensure(); audio.click(); setMapOpen(true); }} className="card-shine flex items-center gap-3 rounded-full bg-gradient-to-b from-lime-300 to-green-500 px-8 py-4 font-display text-2xl font-extrabold text-[#1e143c] shadow-[0_7px_0_rgba(30,20,60,.9)] ring-4 ring-[#1e143c] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none">
                  <MapIcon className="h-6 w-6" />LEVELS
                </button>
                <button onClick={() => startRun('infinite')} className="card-shine flex items-center gap-3 rounded-full bg-gradient-to-b from-fuchsia-400 to-violet-600 px-8 py-4 font-display text-2xl font-extrabold text-white shadow-[0_7px_0_rgba(30,20,60,.9)] ring-4 ring-[#1e143c] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none">
                  <InfinityIcon className="h-6 w-6" />ENDLESS
                </button>
                <button onClick={openMenuShop} className="flex items-center gap-2.5 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 px-7 py-4 font-display text-2xl font-extrabold text-[#1e143c] shadow-[0_7px_0_rgba(30,20,60,.9)] ring-4 ring-[#1e143c] transition-transform hover:scale-105 active:translate-y-1 active:shadow-none">
                  <ShopIcon className="h-6 w-6" />SHOP
                </button>
              </div>
            </div>
          ) : (
            /* ---------- 100 LEVEL MAP ---------- */
            <div className="pointer-events-auto mx-auto my-auto flex max-h-[86vh] w-full max-w-5xl flex-col gap-3 overflow-hidden rounded-[2.2rem] bg-[#1e143c]/82 p-4 ring-4 ring-white/25 backdrop-blur-md sm:flex-row sm:p-5">
              {/* world rail */}
              <div className="relative sm:w-56">
                <div className="mb-2 flex items-center justify-between sm:block">
                  <button onClick={() => { audio.click(); setMapOpen(false); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="font-display text-xl font-extrabold text-white sm:mt-3">WORLDS</div>
                </div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:max-h-[52vh] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden">
                  {WORLDS.map((w, i) => {
                    const done = Math.max(0, Math.min(w.levels, progress.unlocked - i * w.levels));
                    const locked = done === 0 && progress.unlocked <= i * w.levels;
                    const th = THEMES[w.theme];
                    const active = mapWorld === i;
                    return (
                      <button
                        key={w.name}
                        onClick={() => { audio.click(); setMapWorld(i); }}
                        className={`level-node relative flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-left ring-2 sm:w-full ${active ? 'bg-white text-[#1e143c] ring-white' : 'bg-white/10 text-white ring-white/15 hover:bg-white/20'} ${locked ? 'opacity-50' : ''}`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-[#1e143c]" style={{ background: `linear-gradient(150deg, ${hex(th.sky)}, ${th.grassA})` }}>
                          {locked ? <Lock className="h-3.5 w-3.5 text-[#1e143c]" /> : <span className="font-display text-xs font-extrabold text-[#1e143c]">{i + 1}</span>}
                        </span>
                        <span className="min-w-0">
                          <span className="font-display block truncate text-sm font-extrabold leading-tight">{w.name}</span>
                          <span className="block text-[10px] font-bold opacity-70">{done}/{w.levels}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* level grid for selected world */}
              <div className="flex-1 overflow-hidden">
                <div className="mb-3 flex items-end justify-between gap-2">
                  <div>
                    <div className="font-display text-3xl font-extrabold leading-none text-white text-stroke-sm">{WORLDS[mapWorld].name}</div>
                    <div className="mt-1 text-xs font-bold text-white/60">{THEMES[WORLDS[mapWorld].theme].name} · {WORLDS[mapWorld].levels} levels</div>
                  </div>
                  <div className="flex gap-1.5">
                    {GUNS.filter((g) => (hud?.owned || ['bubble']).includes(g.id)).map((g) => (
                      <span key={g.id} className="flex h-10 w-14 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25" title={g.name}><WeaponImage id={g.id} src={weaponPreviews[g.id]} className="h-9 w-14" /></span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2.5">
                  {[...Array(WORLDS[mapWorld].levels)].map((_, l) => {
                    const idx = mapWorld * WORLDS[mapWorld].levels + l;
                    const def = LEVELS[idx];
                    const locked = idx >= progress.unlocked;
                    const th = THEMES[def.theme];
                    return (
                      <button
                        key={idx}
                        disabled={locked}
                        onClick={() => startRun('levels', idx)}
                        className={`level-node group relative aspect-square overflow-hidden rounded-2xl ring-2 ring-[#1e143c] ${locked ? 'cursor-not-allowed opacity-45 grayscale' : 'shadow-[0_5px_0_rgba(30,20,60,.85)]'}`}
                        style={{ background: `linear-gradient(155deg, ${hex(th.sky)}, ${th.grassA})` }}
                      >
                        <span className="font-display absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-extrabold text-[#1e143c]">{l + 1}</span>
                        {locked ? (
                          <Lock className="absolute bottom-1.5 right-1.5 h-4 w-4 text-[#1e143c]" />
                        ) : def.boss ? (
                          <Crown className="absolute bottom-1.5 right-1.5 h-4 w-4 fill-amber-300 text-[#1e143c]" />
                        ) : idx < progress.cleared ? (
                          <Check className="absolute bottom-1.5 right-1.5 h-4 w-4 text-[#1e143c]" />
                        ) : null}
                        {!locked && <span className="absolute left-1.5 top-1.5 font-mono text-[9px] font-bold text-[#1e143c]/60">{def.code}</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-white/8 px-3 py-2">
                  <span className="text-[11px] font-bold text-white/60">Progress</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/35">
                    <span className="block h-full rounded-full bg-gradient-to-r from-lime-300 to-cyan-300 transition-all" style={{ width: `${(cleared / LEVEL_COUNT) * 100}%` }} />
                  </span>
                  <span className="font-display text-xs font-extrabold text-white">{cleared}/{LEVEL_COUNT}</span>
                </div>
              </div>
            </div>
          )}

          {!mapOpen && <DevBadge />}
          <div className="mx-auto hidden items-center gap-2 rounded-full bg-[#1e143c]/65 px-4 py-1.5 text-xs font-extrabold text-white/90 backdrop-blur-md sm:flex">
            <span>WASD</span><span className="opacity-40">•</span><span>CLICK</span><span className="opacity-40">•</span>
            <span>SPACE DASH</span><span className="opacity-40">•</span><span>1–6 GUNS</span>
          </div>
        </div>
      )}

      {/* ================= SHOP ================= */}
      {phase === 'shop' && shop && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#14102b]/85 p-3 backdrop-blur-md sm:p-6">
          <div className="shop-shell animate-pop-in flex w-full max-w-[1080px] flex-col overflow-hidden rounded-[2.4rem] p-4 ring-4 ring-white/25 sm:p-6" role="dialog" aria-modal="true" aria-label="Shop">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-200 to-amber-400 text-[#1e143c] ring-2 ring-[#1e143c]"><ShopIcon className="h-6 w-6" /></div>
                <div>
                  <h2 className="font-display text-2xl font-extrabold leading-none text-white text-stroke-sm sm:text-3xl">{shop.title}</h2>
                  <div className="mt-0.5 text-[11px] font-bold tracking-widest text-white/45">S-S-S SUPPLY SHOP</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-cyan-300 px-4 py-1.5 font-display text-lg font-extrabold text-[#1e143c] ring-2 ring-white/50">
                  <GemIcon className="h-4 w-4" />{shop.gems.toLocaleString()}
                </div>
                {shop.kind !== 'menu' && (
                  <>
                    <button onClick={reroll} className="flex items-center gap-1 rounded-full bg-white/15 px-3.5 py-1.5 font-display text-sm font-extrabold text-white ring-2 ring-white/20 hover:bg-white/25"><DiceIcon className="h-4 w-4" />{shop.rerollCost}</button>
                    <button onClick={heal} disabled={!shop.canHeal || shop.gems < shop.healCost} className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 font-display text-sm font-extrabold ring-2 ring-white/25 ${shop.canHeal && shop.gems >= shop.healCost ? 'bg-emerald-400 text-[#1e143c] hover:brightness-110' : 'bg-white/10 text-white/40'}`}>
                      <HealIcon className="h-4 w-4" />{shop.healCost}
                    </button>
                  </>
                )}
                {shop.kind === 'menu' && (
                  <button onClick={nextStage} aria-label="Close shop" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><X className="h-5 w-5" /></button>
                )}
              </div>
            </div>

            <div className="shop-tabs" role="tablist" aria-label="Shop categories">
              <button id="powerups-tab" role="tab" aria-selected={shopTab === 'powerups'} aria-controls="powerups-panel" onClick={() => { audio.click(); setShopTab('powerups'); }}><Zap size={18} /> Power-ups</button>
              <button id="guns-tab" role="tab" aria-selected={shopTab === 'guns'} aria-controls="guns-panel" onClick={() => { audio.click(); setShopTab('guns'); }}><Crosshair size={18} /> Guns</button>
            </div>
            <div className="shop-scroll flex-1 overflow-y-auto pr-1">
              <section className="shop-panel" id="guns-panel" role="tabpanel" aria-labelledby="guns-tab" hidden={shopTab !== 'guns'}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shop.guns.map((g) => {
                  const afford = shop.gems >= g.cost;
                  return (
                    <div key={g.id} data-gun={g.id} className={`weapon-card rise-in flex flex-col overflow-hidden rounded-3xl ring-2 ${g.equipped ? 'bg-white ring-lime-300' : 'bg-white/8 ring-white/15'}`} style={{ animationDelay: `${GUNS.findIndex((x) => x.id === g.id) * 0.05}s` }}>
                      <div className="weapon-preview-stage relative" style={{ background: `radial-gradient(120% 100% at 50% 0%, ${g.color}44, transparent 70%)` }}>
                        <WeaponImage id={g.id} src={weaponPreviews[g.id]} />
                        {g.equipped && <span className="absolute right-2 top-2 rounded-full bg-lime-300 px-2 py-0.5 font-display text-[10px] font-extrabold text-[#1e143c] ring-2 ring-[#1e143c]">EQUIPPED</span>}
                      </div>
                      <div className={`flex flex-1 flex-col p-3 ${g.equipped ? 'text-[#1e143c]' : 'text-white'}`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-display text-xl font-extrabold leading-none">{g.name}</span>
                          <span className="font-mono text-[10px] font-bold opacity-60">{g.pellets > 1 ? `${g.pellets}x pellet` : g.rate >= 10 ? 'full-auto' : !g.abilities.includes('semi') ? 'auto' : 'tap-fire'}</span>
                        </div>
                        <div className="mt-1 text-xs font-bold opacity-70">{g.blurb}</div>
                        <div className="mt-2"><AbilityChips ids={g.abilities} /></div>
                        <div className={`mt-2.5 space-y-1 ${g.equipped ? '' : 'opacity-90'}`}>
                          <StatBar label="DMG" value={g.dmg / 85} tint="#ff8f6b" />
                          <StatBar label="RATE" value={g.rate / 14} tint="#ffd166" />
                          <StatBar label="KNOCK" value={g.knock / 15} tint="#7df9ff" />
                        </div>
                        <button
                          onClick={() => buyGun(g.id)}
                          aria-label={g.equipped ? `${g.name} equipped` : g.owned ? `Equip ${g.name}` : `Buy ${g.name} for ${g.cost} gems`}
                          disabled={!g.owned && !afford}
                          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 font-display text-base font-extrabold ring-2 ring-[#1e143c] transition-transform ${g.equipped ? 'bg-lime-300 text-[#1e143c]' : g.owned ? 'bg-white text-[#1e143c] hover:scale-[1.03]' : afford ? 'bg-amber-300 text-[#1e143c] hover:scale-[1.03]' : 'bg-black/35 text-white/45'}`}
                        >
                          {g.equipped ? <><Check className="h-4 w-4" />IN USE</> : g.owned ? 'EQUIP' : g.cost === 0 ? 'FREE' : <><GemIcon className="h-4 w-4" />{g.cost}</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </section>
              <section className="shop-panel" id="powerups-panel" role="tabpanel" aria-labelledby="powerups-tab" hidden={shopTab !== 'powerups'}>
                <div className="power-up-grid">
                  {shop.offers.map(offer => <PowerUpCard key={offer.id} offer={offer} gems={shop.gems} onBuy={buyUp} />)}
                </div>
                {shop.offers.length === 0 && <p className="py-8 text-center font-display text-xl font-extrabold text-white">All powered up!</p>}
              </section>
            </div>

            <div className="mt-3 flex justify-center">
              <button onClick={nextStage} className="flex items-center gap-2 rounded-full bg-gradient-to-b from-lime-300 to-green-500 px-9 py-3.5 font-display text-2xl font-extrabold text-[#1e143c] shadow-[0_6px_0_rgba(0,0,0,.45)] ring-4 ring-lime-200/50 transition-transform hover:scale-105 active:translate-y-1 active:shadow-none">
                {shop.nextLabel}<ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PAUSED ================= */}
      {phase === 'paused' && !secretOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#14102b]/75 p-4 backdrop-blur-sm">
          <div className="animate-pop-in w-full max-w-xs rounded-[2rem] bg-white p-6 text-center ring-4 ring-[#1e143c]">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e143c] text-white"><Pause className="h-5 w-5" /></div>
            <h2 className="font-display text-3xl font-extrabold text-[#1e143c]">PAUSED</h2>
            <button onClick={resume} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-lime-300 to-green-500 py-3 font-display text-xl font-extrabold text-[#1e143c] shadow-[0_5px_0_rgba(30,20,60,.9)] ring-2 ring-[#1e143c] hover:brightness-105 active:translate-y-0.5 active:shadow-none">
              <MousePointer2 className="h-5 w-5" />RESUME
            </button>
            <div className="mt-3 flex items-center gap-2 rounded-full bg-[#1e143c]/5 px-3.5 py-2">
              <Crosshair className="h-4 w-4 text-[#1e143c]/60" />
              <input type="range" min={0.0008} max={0.005} step={0.0001} value={sens} onChange={(e) => onSens(parseFloat(e.target.value))} className="flex-1 accent-green-600" />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={retry} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1e143c]/10 py-2.5 text-sm font-extrabold text-[#1e143c] hover:bg-[#1e143c]/15"><RotateCcw className="h-4 w-4" />RETRY</button>
              <button onClick={toMenu} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1e143c]/10 py-2.5 text-sm font-extrabold text-[#1e143c] hover:bg-[#1e143c]/15"><Home className="h-4 w-4" />MENU</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DEAD / VICTORY ================= */}
      {(phase === 'dead' || phase === 'victory') && runStats && (
        <div className={`absolute inset-0 flex items-center justify-center p-4 backdrop-blur-sm ${phase === 'victory' ? 'bg-gradient-to-b from-amber-300/90 to-fuchsia-500/90' : 'bg-[#14102b]/85'}`}>
          <div className="animate-pop-in w-full max-w-sm rounded-[2.2rem] bg-white p-6 text-center ring-4 ring-[#1e143c]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-400 ring-4 ring-[#1e143c]">
              {phase === 'victory' ? <Trophy className="h-8 w-8 text-[#1e143c]" /> : <Skull className="h-8 w-8 text-[#1e143c]" />}
            </div>
            <h2 className="font-display mt-3 text-4xl font-extrabold text-[#1e143c]">{phase === 'victory' ? 'YOU WIN!' : 'SPLATTED!'}</h2>
            {runStats.mode === 'levels' && <div className="mt-1 text-sm font-bold text-[#1e143c]/60">{runStats.levelName}</div>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { v: runStats.mode === 'levels' ? `LV ${runStats.levelNo}` : `W${runStats.wave}`, icon: Target },
                { v: runStats.score.toLocaleString(), icon: Trophy },
                { v: runStats.kills, icon: Skull },
                { v: fmtTime(runStats.time), icon: Timer },
              ].map((s, idx) => (
                <div key={idx} className="flex items-center justify-center gap-2 rounded-2xl bg-[#1e143c]/5 p-3 ring-1 ring-[#1e143c]/10">
                  <s.icon className="h-4 w-4 text-[#1e143c]/55" />
                  <span className="font-display text-xl font-extrabold text-[#1e143c]">{s.v}</span>
                </div>
              ))}
            </div>
            <button onClick={retry} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-lime-300 to-green-500 py-3.5 font-display text-xl font-extrabold text-[#1e143c] shadow-[0_5px_0_rgba(30,20,60,.9)] ring-2 ring-[#1e143c] hover:brightness-105 active:translate-y-0.5 active:shadow-none">
              <RotateCcw className="h-5 w-5" />PLAY AGAIN
            </button>
            <div className="mt-2 flex gap-2">
              <button onClick={openMenuShop} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-amber-300 py-2.5 text-sm font-extrabold text-[#1e143c] ring-2 ring-[#1e143c]"><ShopIcon className="h-4 w-4" />SHOP</button>
              <button onClick={toMenu} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1e143c]/10 py-2.5 text-sm font-extrabold text-[#1e143c] hover:bg-[#1e143c]/15"><Home className="h-4 w-4" />MENU</button>
            </div>
          </div>
        </div>
      )}

      <SecretConsole
        open={secretOpen}
        god={!!hud?.god}
        onClose={closeSecret}
        onGrant={() => { engineRef.current?.setGod(true); setProgress(loadProgress()); }}
        onAdmin={(k: AdminKind) => { engineRef.current?.admin(k); setProgress(loadProgress()); }}
        onToggleGod={(on) => { engineRef.current?.setGod(on); setProgress(loadProgress()); }}
      />

      {isTouch.current && phase === 'playing' && <TouchControls engineRef={engineRef} />}
    </div>
  );
}

function TouchControls({ engineRef }: { engineRef: React.RefObject<GameEngine | null> }) {
  const joyRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const joyId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  const onJoyMove = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== joyId.current) continue;
      const rect = joyRef.current?.getBoundingClientRect();
      if (!rect) continue;
      const dx = Math.max(-1, Math.min(1, (t.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)));
      const dy = Math.max(-1, Math.min(1, ((rect.top + rect.height / 2) - t.clientY) / (rect.height / 2)));
      setKnob({ x: dx * 30, y: dy * 30 });
      engineRef.current?.setTouchMove(dx, dy);
    }
  };
  const onJoyEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyId.current) {
        joyId.current = null;
        setKnob({ x: 0, y: 0 });
        engineRef.current?.setTouchMove(0, 0);
      }
    }
  };

  return (
    <>
      <div
        className="absolute inset-x-0 bottom-0 top-24"
        style={{ touchAction: 'none' }}
        onTouchStart={(e) => {
          for (const t of Array.from(e.changedTouches)) {
            if (t.clientX > window.innerWidth * 0.35 && lookId.current === null) {
              lookId.current = t.identifier;
              lookLast.current = { x: t.clientX, y: t.clientY };
            }
          }
        }}
        onTouchMove={(e) => {
          for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === lookId.current) {
              engineRef.current?.addLook(t.clientX - lookLast.current.x, t.clientY - lookLast.current.y);
              lookLast.current = { x: t.clientX, y: t.clientY };
            }
          }
        }}
        onTouchEnd={(e) => { for (const t of Array.from(e.changedTouches)) if (t.identifier === lookId.current) lookId.current = null; }}
      />
      <div
        ref={joyRef}
        onTouchStart={(e) => { joyId.current = e.changedTouches[0].identifier; }}
        onTouchMove={onJoyMove} onTouchEnd={onJoyEnd} onTouchCancel={onJoyEnd}
        className="absolute bottom-8 left-6 z-10 flex h-28 w-28 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/40 backdrop-blur"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-lg" style={{ transform: `translate(${knob.x}px, ${-knob.y}px)` }}>
          <Move className="h-5 w-5 text-[#1e143c]" />
        </div>
      </div>
      <button
        onTouchStart={(e) => { e.preventDefault(); engineRef.current?.setTouchFiring(true); }}
        onTouchEnd={() => engineRef.current?.setTouchFiring(false)}
        className="absolute bottom-8 right-6 z-10 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-rose-400 to-orange-500 text-white shadow-lg ring-4 ring-white/40 active:scale-95"
      >
        <Crosshair className="h-8 w-8" />
      </button>
      <button onTouchStart={(e) => { e.preventDefault(); engineRef.current?.cycleGun(1); }} className="absolute bottom-40 right-8 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e143c]/80 text-2xl text-white ring-2 ring-white/40 active:scale-95">🔁</button>
      <button onTouchStart={(e) => { e.preventDefault(); engineRef.current?.tryDash(); }} className="absolute bottom-40 left-40 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/90 text-xl text-[#1e143c] ring-2 ring-white/40 active:scale-95">💨</button>
    </>
  );
}
