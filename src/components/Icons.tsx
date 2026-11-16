import type { ReactNode } from 'react';

/* Chunky cartoon icon set — flat candy colours, thick plum outline */
const S = '#241a3d';
type P = { className?: string };

function Svg({ children, className, vb = '0 0 32 32', sw = 2.2 }: { children: ReactNode; className?: string; vb?: string; sw?: number }) {
  return (
    <svg viewBox={vb} className={className} fill="none" stroke={S} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/* ---------------- shop / ui icons ---------------- */
export function GemIcon({ className = 'h-5 w-5' }: P) {
  return (
    <Svg className={className}>
      <path d="M7 12 L11.5 5.5 H20.5 L25 12 L16 27 Z" fill="#38d6ff" />
      <path d="M7 12 H25 L16 27 Z" fill="#1fa8e0" />
      <path d="M11.5 5.5 L14 12 H7 Z" fill="#a8f4ff" />
      <path d="M20.5 5.5 L18 12 H25 Z" fill="#7aeaff" />
      <path d="M7 12 H25 M11.5 5.5 L14 12 L16 5.5 L18 12 L20.5 5.5" strokeWidth={1.5} />
      <path d="M10.5 9 l1.6 -2" stroke="#fff" strokeWidth={1.8} />
    </Svg>
  );
}

export function ShopIcon({ className = 'h-6 w-6' }: P) {
  return (
    <Svg className={className}>
      <rect x="6" y="14" width="20" height="14" rx="2.5" fill="#ffd18a" />
      <rect x="12.5" y="19" width="7" height="9" rx="2" fill="#fff5e4" />
      <path d="M4 12 L7 4.5 H25 L28 12 Z" fill="#ff7eb6" />
      <path d="M11 4.5 L10 12 M16 4.5 V12 M21 4.5 L22 12" strokeWidth={1.6} stroke="#fff5e4" />
      <circle cx="7.4" cy="12.4" r="3.2" fill="#fff5e4" />
      <circle cx="13.1" cy="12.4" r="3.2" fill="#fff5e4" />
      <circle cx="18.9" cy="12.4" r="3.2" fill="#fff5e4" />
      <circle cx="24.6" cy="12.4" r="3.2" fill="#fff5e4" />
    </Svg>
  );
}

export function DiceIcon({ className = 'h-5 w-5' }: P) {
  return (
    <Svg className={className}>
      <g transform="rotate(-10 16 16)">
        <rect x="5" y="5" width="22" height="22" rx="6" fill="#fff5e4" />
        <circle cx="11.5" cy="11.5" r="2" fill="#ff5d8f" stroke="none" />
        <circle cx="20.5" cy="11.5" r="2" fill="#ff5d8f" stroke="none" />
        <circle cx="16" cy="16" r="2" fill="#ff5d8f" stroke="none" />
        <circle cx="11.5" cy="20.5" r="2" fill="#ff5d8f" stroke="none" />
        <circle cx="20.5" cy="20.5" r="2" fill="#ff5d8f" stroke="none" />
      </g>
    </Svg>
  );
}

export function HealIcon({ className = 'h-5 w-5' }: P) {
  return (
    <Svg className={className}>
      <path d="M16 28 C4.5 20 3.5 11 9.5 7.8 C13 6 16 8.8 16 11 C16 8.8 19 6 22.5 7.8 C28.5 11 27.5 20 16 28Z" fill="#ff7a9c" />
      <path d="M16 12.5 v8 M12 16.5 h8" stroke="#fff" strokeWidth={3} />
      <path d="M9 11 q1.5 -2.4 4 -2" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.8} />
    </Svg>
  );
}

