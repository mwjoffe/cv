export type Mode = "career" | "freestyle";
export type Status = "ready" | "playing" | "paused" | "finished";
export type Input = { left: boolean; right: boolean; jump: boolean };
export const FINISH = 4100;
export const checkpoints = [
  {
    x: 450,
    title: "Blue Ant Media",
    detail: "$10M+ ARR built from zero",
    year: "2009–2012",
    index: 7,
  },
  {
    x: 1050,
    title: "Mosaic",
    detail: "From #5 to #1 in consumer preference",
    year: "2012–2014",
    index: 6,
  },
  {
    x: 1750,
    title: "Google",
    detail: "$100M+ in net-new revenue",
    year: "2014–2018",
    index: 5,
  },
  {
    x: 2450,
    title: "YouTube",
    detail: "70% year-over-year revenue growth",
    year: "2018–2021",
    index: 4,
  },
  {
    x: 3200,
    title: "Android",
    detail: "Android onboarding & interoperability",
    year: "2021–2026",
    index: 3,
  },
  {
    x: 3900,
    title: "Google Health & Home",
    detail: "Health & Home product marketing",
    year: "2026–Present",
    index: 0,
  },
];

export const obstacles = [
  { x: 760, kind: "cone" },
  { x: 1300, kind: "barrier" },
  { x: 1650, kind: "cone" },
  { x: 2050, kind: "barrier" },
  { x: 2660, kind: "cone" },
  { x: 3100, kind: "barrier" },
  { x: 3510, kind: "cone" },
] as const;
export type Game = {
  mode: Mode;
  status: Status;
  x: number;
  z: number;
  vz: number;
  vx: number;
  speed: number;
  direction: number;
  time: number;
  score: number;
  lives: number;
  invincible: number;
  collected: number[];
  landed: number;
  airTime: number;
  airDuration: number;
  peak: number;
  bestHeight: number;
  fallTime: number;
  crowdTime: number;
  lastPoints: number;
  clock: number;
  message: string;
  messageTime: number;
  event: "jump" | "bail" | "collect" | "land" | "";
};
export function createGame(mode: Mode): Game {
  return {
    mode,
    status: "ready",
    x: mode === "career" ? 100 : 480,
    z: 0,
    vz: 0,
    vx: 210,
    speed: 0,
    direction: 1,
    time: 60,
    score: 0,
    lives: 3,
    invincible: 0,
    collected: [],
    landed: 0,
    airTime: 0,
    airDuration: 0,
    peak: 0,
    bestHeight: 0,
    fallTime: 0,
    crowdTime: 0,
    lastPoints: 0,
    clock: 0,
    message: "",
    messageTime: 0,
    event: "",
  };
}
export function rampHeight(x: number) {
  return Math.pow(Math.max(0, Math.abs(x - 480) - 145) / 225, 2) * 150;
}
// Both the ramp mesh and rider use the same world-to-screen projection.
export function projectRamp(x: number, depth = 0.58, height = 0) {
  const u = (x - 110) / 740;
  return {
    x: 160 + 680 * u + depth * (-105 + 170 * u),
    y: 350 + 16 * u + depth * 108 - rampHeight(x) - height,
  };
}
// A horizontal camera follows the rider; depth changes elevation, not travel direction.
export function projectCareer(worldX: number, playerX: number, depth = 0.65) {
  return {
    x: worldX - Math.max(0, playerX - 260),
    y: 370 + depth * 125,
    scale: 0.65 + depth * 0.45,
  };
}
const GRAVITY = 880;
function launch(g: Game, velocity: number) {
  g.z = 0.01;
  g.vz = velocity;
  g.airTime = 0;
  g.airDuration = (2 * velocity) / GRAVITY;
  g.peak = (velocity * velocity) / (2 * GRAVITY);
  g.event = "jump";
}
function fall(g: Game) {
  g.lives = Math.max(0, g.lives - 1);
  g.fallTime = 1.15;
  g.invincible = 2.4;
  g.score = Math.max(0, g.score - 100);
  g.speed = 0;
  g.z = 0;
  g.vz = 0;
  g.event = "bail";
  g.message = "COLLISION · −100";
  g.messageTime = 1.8;
}
export function step(g: Game, input: Input, dt: number) {
  if (g.status !== "playing") return;
  dt = Math.min(dt, 1 / 30);
  g.event = "";
  g.clock += dt;
  g.time = Math.max(0, g.time - dt);
  g.invincible = Math.max(0, g.invincible - dt);
  g.messageTime = Math.max(0, g.messageTime - dt);
  g.crowdTime = Math.max(0, g.crowdTime - dt);
  if (g.fallTime > 0) {
    g.fallTime = Math.max(0, g.fallTime - dt);
    if (g.fallTime === 0 && (g.lives === 0 || g.time === 0))
      g.status = "finished";
    return;
  }
  if (g.mode === "career") {
    const target = input.left ? 0 : input.right ? 185 : 130;
    g.speed += (target - g.speed) * dt * 6;
    g.x = Math.min(FINISH, g.x + g.speed * dt);
    if (input.jump && g.z === 0) launch(g, 400);
  } else {
    if (g.z === 0) {
      const steer = Number(input.right) - Number(input.left);
      const target = steer ? steer * 285 : g.direction * 210;
      g.vx += (target - g.vx) * dt * 5;
      if (Math.abs(g.vx) > 5) g.direction = Math.sign(g.vx);
      g.speed = Math.abs(g.vx);
      g.x += g.vx * dt;
      if (input.jump) launch(g, 350 + g.speed * 0.2);
      if (g.x >= 850 || g.x <= 110) {
        g.x = Math.max(110, Math.min(850, g.x));
        if (g.z === 0) launch(g, 310 + g.speed * 0.28);
        g.direction *= -1;
        g.vx = g.direction * Math.max(210, g.speed);
      }
    } else {
      g.x += g.direction * 175 * dt;
      if (g.x > 850 || g.x < 110) {
        g.x = Math.max(110, Math.min(850, g.x));
        g.direction *= -1;
        g.vx = g.direction * 210;
      }
    }
  }
  if (g.z > 0) {
    g.airTime += dt;
    const v = (g.airDuration * GRAVITY) / 2;
    g.vz = v - GRAVITY * g.airTime;
    g.z = Math.max(0, v * g.airTime - (GRAVITY * g.airTime * g.airTime) / 2);
    if (g.z === 0) {
      g.vz = 0;
      g.landed++;
      g.bestHeight = Math.max(g.bestHeight, g.peak);
      g.lastPoints = g.mode === "career" ? 50 : Math.round(g.peak / 10) * 10;
      g.score += g.lastPoints;
      g.event = "land";
      if (g.mode === "freestyle") {
        g.crowdTime = 2;
        g.message = `JUMP ${g.landed} · +${g.lastPoints}`;
        g.messageTime = 1.5;
      }
    }
  }
  if (g.mode === "career") {
    for (const o of obstacles) {
      if (
        Math.abs(g.x - o.x) < 24 &&
        g.z < (o.kind === "barrier" ? 40 : 30) &&
        g.invincible === 0
      ) {
        fall(g);
        break;
      }
    }
    checkpoints.forEach((c, i) => {
      if (g.x >= c.x && !g.collected.includes(i)) {
        g.collected.push(i);
        g.score += 500;
        g.event = "collect";
        g.message = c.title.toUpperCase();
        g.messageTime = 2;
      }
    });
  }
  if (
    g.fallTime === 0 &&
    (g.time === 0 || g.lives === 0 || (g.mode === "career" && g.x >= FINISH))
  )
    g.status = "finished";
}
