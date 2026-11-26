"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Top-down billiard table drawn in SVG. A cue strikes the cue ball, which
 * rolls into the rack — a loop that sets the sporty, kinetic tone of the hero.
 */
const R = 9;
const APEX = { x: 418, y: 170 };
const COLORS = [
  "#f5c518", "#1e4fd6", "#d62828", "#6a2c91", "#f77f00", "#2a9d4b", "#8b1e2d", "#111111",
];

// Standard 8-ball rack order (8 in the middle of the third row).
const RACK_ORDER = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];

type Ball = { n: number; x: number; y: number };
const rack: Ball[] = (() => {
  const balls: Ball[] = [];
  let k = 0;
  for (let row = 0; row < 5; row++) {
    for (let j = 0; j <= row; j++) {
      balls.push({
        n: RACK_ORDER[k++],
        x: APEX.x + row * (R * 2 * 0.87),
        y: APEX.y + (j - row / 2) * (R * 2 + 0.6),
      });
    }
  }
  return balls;
})();

const pockets = [
  [34, 34], [300, 28], [566, 34], [34, 306], [300, 312], [566, 306],
];
const diamondsX = [97, 163, 230, 370, 437, 503];
const diamondsY = [100, 170, 240];

function BallGlyph({ n, x, y }: Ball) {
  const color = COLORS[(n - 1) % 8];
  const stripe = n > 8;
  const id = `ball-${n}`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <clipPath id={id}>
        <circle r={R} />
      </clipPath>
      <circle r={R} fill={stripe ? "#f3f0e8" : color} />
      {stripe ? <rect x={-R} y={-R * 0.52} width={R * 2} height={R * 1.04} fill={color} clipPath={`url(#${id})`} /> : null}
      <circle r={R * 0.42} fill="#f3f0e8" opacity={n === 8 || stripe ? 1 : 0.95} />
      <text
        y={2.4}
        textAnchor="middle"
        fontSize="6.4"
        fontWeight="700"
        fill="#0b0b0b"
        fontFamily="var(--font-body)"
      >
        {n}
      </text>
      <circle cx={-R * 0.38} cy={-R * 0.42} r={R * 0.22} fill="white" opacity={0.55} />
    </g>
  );
}

export function HeroTable() {
  const reduce = useReducedMotion();
  const loop = { duration: 4.2, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" as const };

  return (
    <svg
      viewBox="0 0 600 340"
      role="img"
      aria-label="Ilustrasi meja billiard dengan bola yang sedang dibreak"
      className="h-auto w-full drop-shadow-[0_40px_60px_rgba(0,0,0,0.55)]"
    >
      <defs>
        <radialGradient id="cloth" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#1f6fd1" />
          <stop offset="60%" stopColor="#11498f" />
          <stop offset="100%" stopColor="#0a2f60" />
        </radialGradient>
        <linearGradient id="rail" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#232a35" />
          <stop offset="100%" stopColor="#11151c" />
        </linearGradient>
        <linearGradient id="cue" x1="0" x2="1">
          <stop offset="0%" stopColor="#2a1b0e" />
          <stop offset="55%" stopColor="#b98a4a" />
          <stop offset="96%" stopColor="#efe2c4" />
          <stop offset="100%" stopColor="#4b88c9" />
        </linearGradient>
        <radialGradient id="lamp" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.16" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Frame + rails */}
      <rect x="4" y="4" width="592" height="332" rx="30" fill="url(#rail)" stroke="rgba(255,255,255,0.08)" />
      <rect x="22" y="22" width="556" height="296" rx="16" fill="#0a0d12" />
      <rect x="30" y="30" width="540" height="280" rx="10" fill="url(#cloth)" />
      <ellipse cx="300" cy="170" rx="260" ry="130" fill="url(#lamp)" />

      {/* Head string + spot */}
      <line x1="165" y1="34" x2="165" y2="306" stroke="white" strokeOpacity="0.12" strokeDasharray="3 5" />
      <circle cx={APEX.x} cy={APEX.y} r="2" fill="white" opacity="0.35" />

      {diamondsX.map((x) => (
        <g key={`d-${x}`} fill="var(--brass)" opacity="0.85">
          <rect x={x - 2.5} y="10" width="5" height="5" transform={`rotate(45 ${x} 12.5)`} />
          <rect x={x - 2.5} y="325" width="5" height="5" transform={`rotate(45 ${x} 327.5)`} />
        </g>
      ))}
      {diamondsY.map((y) => (
        <g key={`dy-${y}`} fill="var(--brass)" opacity="0.85">
          <rect x="10" y={y - 2.5} width="5" height="5" transform={`rotate(45 12.5 ${y})`} />
          <rect x="585" y={y - 2.5} width="5" height="5" transform={`rotate(45 587.5 ${y})`} />
        </g>
      ))}

      {pockets.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="13" fill="#020305" stroke="rgba(255,255,255,0.06)" />
      ))}

      {/* Rack: the apex reacts to the hit */}
      <motion.g
        animate={reduce ? undefined : { x: [0, 0, 0, 3, 0], y: [0, 0, 0, -1, 0] }}
        transition={reduce ? undefined : { ...loop, times: [0, 0.5, 0.62, 0.66, 0.8] }}
      >
        {rack.map((b) => (
          <BallGlyph key={b.n} {...b} />
        ))}
      </motion.g>

      {/* Aim line */}
      <motion.line
        x1="150"
        y1="170"
        x2={APEX.x - R - 2}
        y2="170"
        stroke="white"
        strokeWidth="1"
        strokeDasharray="2 6"
        initial={{ opacity: 0.35 }}
        animate={reduce ? undefined : { opacity: [0.35, 0.35, 0, 0, 0.35] }}
        transition={reduce ? undefined : { ...loop, times: [0, 0.4, 0.45, 0.9, 1] }}
      />

      {/* Cue ball */}
      <motion.g
        initial={{ x: 0 }}
        animate={reduce ? undefined : { x: [0, 0, APEX.x - 150 - R * 2, APEX.x - 150 - R * 2 - 6, 0] }}
        transition={reduce ? undefined : { ...loop, times: [0, 0.42, 0.62, 0.72, 1] }}
      >
        <circle cx="150" cy="170" r={R} fill="#f6f3ec" />
        <circle cx="146.5" cy="166.2" r="2.2" fill="white" />
      </motion.g>

      {/* Cue stick */}
      <motion.g
        initial={{ x: 0, opacity: 1 }}
        animate={reduce ? undefined : { x: [-6, -38, 0, 0, -6], opacity: [1, 1, 1, 0, 1] }}
        transition={reduce ? undefined : { ...loop, times: [0, 0.32, 0.42, 0.6, 1] }}
      >
        <rect x="-150" y="167.5" width="286" height="5" rx="2.5" fill="url(#cue)" />
      </motion.g>
    </svg>
  );
}
