const letter = 'M128 51 C109 29 57 26 44 57 C23 104 125 83 131 126 C137 167 80 184 43 157';

export default function GameLogo() {
  return (
    <h1 className="game-logo" aria-label="S-S-S: Slime-Shot-Storm">
      <svg viewBox="0 0 690 268" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="sss-mint" x2="0.2" y2="1">
            <stop stopColor="#e0ffb0" /><stop offset=".4" stopColor="#a5f17e" /><stop offset="1" stopColor="#42cc9c" />
          </linearGradient>
          <linearGradient id="sss-pink" x2=".2" y2="1">
            <stop stopColor="#ffe3ea" /><stop offset=".4" stopColor="#ffa5d0" /><stop offset="1" stopColor="#ed70c6" />
          </linearGradient>
          <linearGradient id="sss-blue" x2=".2" y2="1">
            <stop stopColor="#e5eeff" /><stop offset=".4" stopColor="#bbbdff" /><stop offset="1" stopColor="#8b88ee" />
          </linearGradient>
        </defs>
        {['mint', 'pink', 'blue'].map((color, i) => (
          <g key={color} transform={`translate(${40 + i * 218}, 4)`}>
            <g className={`game-logo__letter game-logo__letter--${i}`}>
              <path d={letter} fill="none" stroke="#261a42" strokeWidth="61" strokeLinecap="round" transform="translate(0,8)" />
              <path d={letter} fill="none" stroke="#261a42" strokeWidth="61" strokeLinecap="round" />
              <path d={letter} fill="none" stroke="#fff6ff" strokeWidth="52" strokeLinecap="round" />
              <path d={letter} fill="none" stroke={`url(#sss-${color})`} strokeWidth="45" strokeLinecap="round" />
              <path d="M58 43 Q85 30 109 43" fill="none" stroke="#fff" strokeOpacity=".86" strokeWidth="7" strokeLinecap="round" />
              <circle cx="45" cy="56" r="3.5" fill="#fff" opacity=".8" />
              <g transform={`translate(${i === 1 ? 61 : 70},${i === 1 ? 48 : 158})`}>
                <ellipse cx="4" cy="2" rx="4" ry="5.4" fill="#35234c" />
                <ellipse cx="27" cy="2" rx="4" ry="5.4" fill="#35234c" />
                <circle cx="5" cy=".5" r="1.4" fill="#fff" />
                <circle cx="28" cy=".5" r="1.4" fill="#fff" />
                <path d="M12 10 Q16 14 20 10" fill="none" stroke="#35234c" strokeWidth="2.6" strokeLinecap="round" />
                <ellipse cx="-4" cy="10" rx="5" ry="2.8" fill="#f271a5" opacity=".65" />
                <ellipse cx="35" cy="10" rx="5" ry="2.8" fill="#f271a5" opacity=".65" />
              </g>
            </g>
          </g>
        ))}
        {[236, 454].map((x, i) => (
          <g key={x} transform={`rotate(${i ? -9 : 9}, ${x}, 114)`}>
            <path d={`M${x - 9} 114h18`} stroke="#261a42" strokeWidth="24" strokeLinecap="round" />
            <path d={`M${x - 9} 112h18`} stroke="#fff5dc" strokeWidth="15" strokeLinecap="round" />
          </g>
        ))}
        <text
          className="game-logo__subtitle"
          x="345" y="252" textAnchor="middle"
          stroke="#261a42" strokeWidth="7" strokeLinejoin="round"
          fill="#fff8eb" paintOrder="stroke"
        >SLIME-SHOT-STORM</text>
      </svg>
      <span className="sr-only">S-S-S: Slime-Shot-Storm</span>
    </h1>
  );
}