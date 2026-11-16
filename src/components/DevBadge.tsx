import { useEffect, useRef, useState } from 'react';
import { audio } from '../game/audio';

const LINKEDIN = 'https://www.linkedin.com/in/abhishek-kumar-tiwari-b448b5328/';
const GITHUB = 'https://github.com/blackshadowog';

function LinkedInMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** Cute floating dev badge: slime avatar + LinkedIn + GitHub */
export default function DevBadge() {
  const [hover, setHover] = useState(false);
  const [poke, setPoke] = useState(0);
  const [bubble, setBubble] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const wave = () => {
    audio.ensure();
    audio.slimeChat(1.25, 1.8);
    setPoke((k) => k + 1);
    setBubble(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBubble(false), 2400);
  };

  const show = hover || bubble;

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-4 z-10 sm:bottom-6 sm:left-6"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* speech bubble */}
      <div className={`absolute bottom-full left-0 mb-3 origin-bottom-left whitespace-nowrap rounded-2xl bg-white px-3.5 py-2 ring-[3px] ring-[#1e143c] transition-all duration-200 ${show ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'}`}>
        <div className="font-display text-sm font-extrabold leading-none text-[#1e143c]">Made by Abhishek</div>
        <div className="mt-0.5 text-[10px] font-bold text-[#1e143c]/55">@blackshadowog</div>
        <span className="absolute -bottom-[7px] left-6 h-3 w-3 rotate-45 bg-white ring-[3px] ring-[#1e143c]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
      </div>

      <div className="flex items-center gap-2 rounded-full bg-[#1e143c]/85 p-1.5 pr-2.5 ring-2 ring-white/30 backdrop-blur-md">
        {/* slime avatar */}
        <button
          onClick={wave}
          aria-label="Developer"
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-lime-300 to-green-500 ring-[3px] ring-[#1e143c] transition-transform hover:scale-110 active:scale-95"
        >
          <svg key={poke} viewBox="0 0 40 40" className={`h-9 w-9 ${poke ? 'animate-squish-once' : ''}`} aria-hidden="true">
            <path d="M5 28 C5 14 12 8 20 8 C28 8 35 14 35 28 C35 31 33 32.5 30 32.5 H10 C7 32.5 5 31 5 28 Z" fill="#8ff5a0" stroke="#241a3d" strokeWidth="2.4" strokeLinejoin="round" />
            <ellipse cx="13" cy="15" rx="3.4" ry="2" fill="#fff" opacity="0.75" />
            <ellipse cx="14.5" cy="23" rx="2.2" ry="2.8" fill="#241a3d" />
            <ellipse cx="25.5" cy="23" rx="2.2" ry="2.8" fill="#241a3d" />
            <circle cx="15.2" cy="22" r="0.8" fill="#fff" />
            <circle cx="26.2" cy="22" r="0.8" fill="#fff" />
            <path d="M17 27 q3 3 6 0" fill="none" stroke="#241a3d" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10.5" cy="27" r="2" fill="#ff8ab8" opacity="0.75" />
            <circle cx="29.5" cy="27" r="2" fill="#ff8ab8" opacity="0.75" />
          </svg>
          <span className="absolute -right-2 -top-2 rounded-full bg-fuchsia-500 px-1.5 py-[1px] font-display text-[9px] font-extrabold tracking-wider text-white ring-2 ring-[#1e143c]">DEV</span>
        </button>

        <a
          href={LINKEDIN}
          target="_blank"
          rel="noopener noreferrer"
          title="LinkedIn"
          aria-label="LinkedIn"
          onClick={() => audio.click()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0a66c2] text-white ring-[3px] ring-[#1e143c] shadow-[0_3px_0_rgba(0,0,0,.4)] transition-transform hover:-translate-y-1 hover:scale-110 active:translate-y-0"
        >
          <LinkedInMark className="h-[22px] w-[22px]" />
        </a>

        <a
          href={GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub"
          aria-label="GitHub"
          onClick={() => audio.click()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f0ff] text-[#24292f] ring-[3px] ring-[#1e143c] shadow-[0_3px_0_rgba(0,0,0,.4)] transition-transform hover:-translate-y-1 hover:scale-110 active:translate-y-0"
        >
          <GitHubMark className="h-[22px] w-[22px]" />
        </a>
      </div>
    </div>
  );
}
