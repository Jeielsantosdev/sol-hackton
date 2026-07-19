import type { GameMatch } from "./matches.js";

// Dataset simulado da Copa 2026 (104 jogos) usado quando a API TxLINE não está
// disponível — mesmo formato do dado real, então o front não sabe a diferença.

const TEAMS = [
  "Brazil", "Argentina", "France", "England", "Spain", "Germany",
  "Portugal", "Netherlands", "Belgium", "Croatia", "Uruguay", "Colombia",
  "Mexico", "United States", "Canada", "Japan", "South Korea", "Australia",
  "Morocco", "Senegal", "Nigeria", "Egypt", "Ghana", "Cameroon",
  "Switzerland", "Denmark", "Poland", "Serbia", "Austria", "Ukraine",
  "Ecuador", "Paraguay", "Chile", "Peru", "Venezuela", "Costa Rica",
  "Panama", "Jamaica", "Saudi Arabia", "Iran", "Qatar", "Uzbekistan",
  "Jordan", "Algeria", "Tunisia", "Ivory Coast", "Norway", "Scotland",
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(rand: () => number, lambda: number): number {
  let l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
}

const STAGES: Array<[string, number]> = [
  ["Group Stage", 72],
  ["Round of 32", 16],
  ["Round of 16", 8],
  ["Quarter-finals", 4],
  ["Semi-final", 2],
  ["Third Place Playoff", 1],
  ["Final", 1],
];

export function generateMockMatches(): GameMatch[] {
  const rand = mulberry32(2026);
  const matches: GameMatch[] = [];
  const kickoff = Date.UTC(2026, 5, 11, 18, 0, 0); // 11 jun 2026
  let matchIndex = 0;

  for (const [stage, count] of STAGES) {
    for (let i = 0; i < count; i++) {
      const t1 = TEAMS[Math.floor(rand() * TEAMS.length)];
      let t2 = TEAMS[Math.floor(rand() * TEAMS.length)];
      while (t2 === t1) t2 = TEAMS[Math.floor(rand() * TEAMS.length)];

      const pos1 = Math.round(35 + rand() * 30);
      matches.push({
        fixtureId: 26000000 + matchIndex,
        competition: "FIFA World Cup 2026",
        stage,
        matchNumber: matchIndex + 1,
        startTime: kickoff + matchIndex * 8 * 60 * 60 * 1000,
        home: t1,
        away: t2,
        stats: {
          goals: [poisson(rand, 1.5), poisson(rand, 1.2)],
          corners: [poisson(rand, 5.2), poisson(rand, 4.6)],
          yellowCards: [poisson(rand, 1.8), poisson(rand, 2.0)],
          redCards: [rand() < 0.06 ? 1 : 0, rand() < 0.06 ? 1 : 0],
          possession: [pos1, 100 - pos1],
        },
        finished: true,
      });
      matchIndex++;
    }
  }
  return matches;
}
