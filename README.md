# 💥 Slime-Shot-Storm (S-S-S)

[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r187-black?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38BDF8?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Slime-Shot-Storm** is a vibrant, fast-paced cartoonish 3D first-person shooter loop game. Pop bouncy slimes, harvest shiny gems, unlock candy-textured toy guns, rocket-jump across whimsical landscapes, and blast through 100 levels across 10 unique worlds (or test your reflexes in Endless Wave Mode)!

---

## 🎮 Gameplay & Features

- **10 Unique Slime Species**:
  - 🟢 **Minty** (Basic, bouncy hopper)
  - 🔵 **Zippy** (Fast and nimble)
  - 🌸 **Bonk** (Heavy tank slime with huge knock resistance)
  - 🟠 **Bouncy** (High-jumping acrobat)
  - 🪙 **Goldie** (Rare, evasive gem carrier — chase it down!)
  - 🌿 **Split & Mini** (Splits into smaller aggressive mintlings on pop)
  - 🫐 **Berry** (Spiky and armored)
  - 👻 **Boo** (Phase-shifting ghost slime)
  - 👑 **King Boss** (Colossal world bosses with devastating power)

- **6 Toy Blasters & Weapons**:
  - 🫧 **Bubble Blaster** — Trusty, well-balanced starter weapon.
  - 🍬 **Gumdrop Shotgun** — High-knockback, 7-pellet spread at close range.
  - 🌈 **Sprinkle Machine Gun** — 14 rounds-per-second full-auto rainbow stream.
  - 🧴 **Glue Cannon** — Slows down entire mobs with sticky goo.
  - 🍯 **Honey Sniper** — Piercing, high-damage precision shots with critical hits.
  - 🍭 **Lollipop Rocket Launcher** — Massive splash damage and physics-based **Rocket Jumping**!

- **10 Whimsical Worlds (100 Levels + Endless Mode)**:
  - 🌻 Sunny Meadow
  - 🌸 Sakura Grove
  - 🍬 Candy Land
  - 🏖️ Coral Beach
  - ❄️ Frosty Peak
  - 🍄 Mushroom Glen
  - 🏜️ Desert Mesa
  - 🌈 Rainbow Hills
  - ☁️ Cloud Kingdom
  - 💎 Crystal Crown

- **Permanent Upgrades & Shop**:
  - Invest collected gems into Damage, Fire Rate, Multi-shot, Magnet radius, Max HP, Speed, Crit Chance, Pierce, and Knockback.
  - Progress and shop upgrades are automatically saved to local storage.

- **Dynamic Visuals & Procedural Web Audio**:
  - Balloon-burst particle physics with confetti scraps, expanding shock rings, and floating gems.
  - Procedural synthesizer sound effects and musical chords per world generated in real-time via the Web Audio API — zero heavy asset downloads.
  - Real-time 3D weapon previews rendered dynamically from the game meshes.

---

## 🕹️ Controls

| Action | Control |
| :--- | :--- |
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| **Aim & Shoot** | **Mouse Movement** + **Left Click** (Hold for auto) |
| **Dash** | <kbd>Space</kbd> |
| **Sprint** | <kbd>Shift</kbd> |
| **Switch Weapon** | <kbd>1</kbd> - <kbd>6</kbd> or **Mouse Wheel** |
| **Pause / Resume** | <kbd>Esc</kbd> |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/blackshadowog/slime-shot-storm.git
   cd slime-shot-storm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser at the URL shown in the terminal (usually `http://localhost:5173`).

---

## 🛠️ Build & Verification

- **Type Check**:
  ```bash
  npx tsc --noEmit
  ```

- **Production Build**:
  ```bash
  npm run build
  ```

- **Preview Production Build**:
  ```bash
  npm run preview
  ```

- **Run Automated Verification (Playwright)**:
  ```bash
  # Ensure dev server is running
  node scripts/verify-game.mjs
  ```

---

## 📦 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **3D Engine**: [Three.js](https://threejs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Audio**: Web Audio API (procedural synthesis)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Testing**: [Playwright](https://playwright.dev/)

---

## 📜 License

MIT License. Have fun popping slimes! 🎈✨
