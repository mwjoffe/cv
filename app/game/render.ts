import {
  checkpoints,
  obstacles,
  projectRamp,
  projectCareer,
  FINISH,
  type Game,
} from "./engine";
type Point = { x: number; y: number };
const C = {
  ink: "#182c28",
  sky: "#99acd3",
  cream: "#e7e8c8",
  green: "#396249",
  tree: "#244d3c",
  leaf: "#66835a",
  orange: "#dd7950",
  roof: "#30413e",
  road: "#67736c",
};
const textureCache = new WeakMap<
  CanvasRenderingContext2D,
  CanvasPattern | null
>();
export function draw(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.imageSmoothingEnabled = false;
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(
      Math.round(x / 2) * 2,
      Math.round(y / 2) * 2,
      Math.ceil(w / 2) * 2,
      Math.ceil(h / 2) * 2,
    );
  };
  const poly = (points: Point[], color: string | CanvasPattern) => {
    ctx.beginPath();
    points.forEach((p, i) =>
      i
        ? ctx.lineTo(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2)
        : ctx.moveTo(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2),
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  const line = (a: Point, b: Point, c: string, width = 3) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  const text = (
    s: string,
    x: number,
    y: number,
    size = 12,
    color = C.cream,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px monospace`;
    ctx.fillText(s, Math.round(x), Math.round(y));
  };
  if (!textureCache.has(ctx)) {
    const tile = ctx.canvas.ownerDocument.createElement("canvas");
    tile.width = 8;
    tile.height = 8;
    const t = tile.getContext("2d")!;
    t.fillStyle = "#13251d25";
    t.fillRect(0, 0, 2, 2);
    t.fillRect(4, 4, 2, 2);
    textureCache.set(ctx, ctx.createPattern(tile, "repeat"));
  }
  const texture = textureCache.get(ctx);
  const textured = (points: Point[], color: string) => {
    poly(points, color);
    if (texture) poly(points, texture);
  };
  const tree = (x: number, y: number, s: number) => {
    rect(x - 5 * s, y - 70 * s, 10 * s, 80 * s, "#4c5333");
    for (let i = 0; i < 3; i++) {
      const cy = y - 55 * s - i * 22 * s,
        w = (64 - i * 12) * s;
      const shape = [
        { x: x - w / 2, y: cy },
        { x: x - w / 2, y: cy - 18 * s },
        { x: x - w / 3, y: cy - 18 * s },
        { x: x - w / 3, y: cy - 32 * s },
        { x: x + w / 3, y: cy - 32 * s },
        { x: x + w / 3, y: cy - 18 * s },
        { x: x + w / 2, y: cy - 18 * s },
        { x: x + w / 2, y: cy },
      ];
      textured(shape, i % 2 ? C.leaf : C.tree);
    }
  };
  const house = (
    x: number,
    y: number,
    w: number,
    h: number,
    tone = C.cream,
  ) => {
    // Roof, side elevation, eaves, inset windows, and a cast ground shadow.
    poly(
      [
        { x: x - 8, y: y + h },
        { x: x + w, y: y + h },
        { x: x + w + 55, y: y + h + 20 },
        { x: x + 25, y: y + h + 20 },
      ],
      "#102b2435",
    );
    rect(x, y, w, h, tone);
    poly(
      [
        { x: x + w, y },
        { x: x + w + 36, y: y - 22 },
        { x: x + w + 36, y: y + h - 22 },
        { x: x + w, y: y + h },
      ],
      "#7c8d7b",
    );
    textured(
      [
        { x: x - 18, y },
        { x: x + 26, y: y - 44 },
        { x: x + w - 3, y: y - 44 },
        { x: x + w + 19, y },
      ],
      C.roof,
    );
    rect(x - 18, y, w + 38, 7, C.ink);
    rect(x + 30, y - 58, 13, 24, "#8c8870");
    for (let wx = x + 14; wx < x + w - 18; wx += 36) {
      rect(wx, y + 24, 23, 35, C.ink);
      rect(wx + 3, y + 27, 17, 24, "#8da6a0");
      rect(wx + 10, y + 27, 3, 24, C.cream);
      rect(wx + 3, y + 38, 17, 3, C.cream);
      rect(wx - 2, y + 59, 27, 4, "#8f9980");
    }
    rect(x + w * 0.6, y + h - 34, 20, 34, "#5e6955");
  };
  const sky = (scroll = 0) => {
    rect(0, 0, 960, 540, C.sky);
    rect(0, 117, 960, 75, "#bbcfbb");
    for (let i = 0; i < 6; i++) {
      const x = ((((i * 205 - scroll * 0.06) % 1150) + 1150) % 1150) - 50,
        y = 32 + (i % 3) * 23;
      rect(x, y, 79, 10, C.cream);
      rect(x + 14, y - 10, 41, 12, C.cream);
      rect(x + 24, y - 18, 20, 12, C.cream);
    }
    for (let i = 0; i < 35; i++) {
      const x = i * 32 - ((scroll * 0.025) % 32),
        h = 15 + ((i * 43) % 49);
      rect(x, 160 - h, 25, h, "#839f9f");
    }
    rect(0, 161, 960, 380, "#73946b");
  };
  const crowd = () => {
    const cheering = g.crowdTime > 0;
    const shirts = [C.cream, "#728aaf", C.orange, "#a294b7", "#bbc778"];
    rect(276, 220, 418, 76, C.ink);
    for (let row = 0; row < 2; row++) {
      const y = 237 + row * 29;
      rect(276, y + 15, 418, 6, "#a39b69");
      for (let i = 0; i < 18; i++) {
        const x = 282 + i * 23,
          raised = cheering && Math.sin(g.clock * 13 + i + row) > -0.2,
          hop = raised ? 3 : 0,
          skin = ["#deb792", "#ac7955", "#775d46"][(i + row) % 3];
        rect(x + 3, y - 17 - hop, 9, 10, skin);
        rect(x + 2, y - 20 - hop, 11, 4, C.ink);
        rect(x, y - 7 - hop, 16, 17, shirts[(i + row) % 5]);
        rect(x + 1, y + 10, 5, 8, C.ink);
        rect(x + 10, y + 10, 5, 8, C.ink);
        line(
          { x: x + 1, y: y - 3 - hop },
          { x: x - 3, y: y + (raised ? -18 : 7) - hop },
          skin,
          4,
        );
        line(
          { x: x + 14, y: y - 3 - hop },
          { x: x + 19, y: y + (raised ? -18 : 7) - hop },
          skin,
          4,
        );
      }
    }
    // Clipped seating-front chyron; cheers continue in the animated spectators.
    rect(238, 291, 502, 45, C.ink);
    rect(242, 295, 494, 37, C.green);
    ctx.save();
    ctx.beginPath();
    ctx.rect(248, 297, 482, 33);
    ctx.clip();
    ctx.font = "bold 25px monospace";
    const headlines =
      checkpoints
        .map((cp) => `${cp.title.toUpperCase()}  ·  ${cp.detail}`)
        .join("     ◆     ") + "     ◆     ";
    const width = ctx.measureText(headlines).width;
    const offset = ((g.clock / 55) * width) % width;
    text(headlines, 250 - offset, 323, 25);
    text(headlines, 250 - offset + width, 323, 25);
    ctx.restore();
  };
  const rider = (x: number, y: number, scale: number, rear = false) => {
    rect(x - 24 * scale, y + 3, 48 * scale, 7 * scale, "#132a2940");
    if (g.invincible > 0 && g.fallTime === 0 && Math.floor(g.clock * 12) % 2)
      return;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y - g.z * scale));
    ctx.scale(scale, scale);
    if (!rear && g.direction < 0) ctx.scale(-1, 1);
    if (g.fallTime > 0) {
      ctx.translate(0, -10);
      ctx.rotate((Math.min(1, (1.15 - g.fallTime) / 0.32) * Math.PI) / 2);
    }
    if (g.fallTime === 0) {
      rect(-24, -5, 47, 6, "#95b35b");
      rect(-28, -9, 9, 5, "#95b35b");
      rect(21, -9, 9, 5, "#95b35b");
      rect(-16, 2, 7, 6, C.ink);
      rect(14, 2, 7, 6, C.ink);
    }
    rect(-17, -16, 15, 8, C.ink);
    rect(11, -16, 16, 8, C.ink);
    rect(-12, -37, 10, 23, "#384963");
    rect(-7, -41, 25, 11, "#384963");
    rect(12, -35, 10, 20, "#384963");
    rect(-12, -64, 30, 26, C.cream);
    rect(-12, -46, 30, 8, C.green);
    rect(-20, -60, 9, 22, "#d59e70");
    rect(18, -61, 9, 22, "#d59e70");
    if (g.z > 15) {
      rect(-28, -43, 15, 6, "#d59e70");
      rect(25, -48, 14, 6, "#d59e70");
    }
    rect(-6, -81, 21, 17, "#d59e70");
    rect(-10, -88, 28, 10, "#c26146");
    if (rear) {
      rect(-7, -78, 21, 5, C.ink);
      rect(-6, -83, 22, 7, "#c26146");
    } else {
      rect(11, -77, 9, 6, "#d59e70");
      rect(11, -79, 3, 3, C.ink);
      rect(15, -84, 12, 5, "#c26146");
    }
    ctx.restore();
    if (g.fallTime > 0) {
      rect(x + 30 + (1.15 - g.fallTime) * 35, y - 5, 40, 6, "#95b35b");
      text("×", x - 10, y - 24, 20, C.orange);
    }
  };
  if (g.mode === "freestyle") {
    sky();
    house(-15, 112, 210, 105);
    house(222, 107, 177, 91, "#c5cdb6");
    house(440, 100, 230, 95);
    house(720, 110, 230, 100);
    for (const x of [23, 188, 410, 707, 939]) tree(x, 239, 1.08);
    rect(0, 224, 960, 73, "#9b8759");
    for (let x = 0; x < 960; x += 19) {
      rect(x, 215, 13, 80, "#706848");
      rect(x + 2, 219, 8, 72, "#a29362");
    }
    rect(0, 240, 960, 5, "#c4b278");
    rect(0, 280, 960, 5, "#c4b278");
    crowd();
    // A projected U-shaped surface: rear coping, deep deck, near-side timber frame.
    for (let i = 0; i <= 21; i++) {
      const p = projectRamp(110 + (i / 21) * 740, 1);
      rect(p.x - 4, p.y + 4, 9, 526 - p.y, C.ink);
      rect(p.x - 1, p.y + 6, 3, 518 - p.y, "#888957");
      if (i < 21) {
        const q = projectRamp(110 + ((i + 1) / 21) * 740, 1);
        line({ x: p.x, y: 520 }, { x: q.x, y: q.y + 8 }, "#5c6844", 4);
      }
    }
    line({ x: 52, y: 522 }, { x: 910, y: 522 }, C.ink, 7);
    for (let i = 0; i < 80; i++) {
      const x = 110 + (i / 80) * 740,
        nx = 110 + ((i + 1) / 80) * 740;
      const a = projectRamp(x, 0),
        b = projectRamp(nx, 0),
        c = projectRamp(nx, 1),
        d = projectRamp(x, 1);
      const edge = Math.abs(i / 80 - 0.5) * 2;
      const light = 67 - edge * 19 + (i % 8 === 0 ? 4 : 0);
      textured([a, b, c, d], `hsl(67 35% ${light}%)`);
      if (i % 5 === 0) line(a, d, "#748057", 1.5);
    }
    for (const depth of [0, 1]) {
      for (let i = 0; i < 80; i++)
        line(
          projectRamp(110 + (i / 80) * 740, depth),
          projectRamp(110 + ((i + 1) / 80) * 740, depth),
          depth === 0 ? "#e6e5ac" : C.ink,
          depth === 0 ? 5 : 6,
        );
    }
    // Elevated decks at both ends, with rails aligned to their perspective.
    for (const side of [0, 1]) {
      const x = side ? 850 : 110,
        b = projectRamp(x, 0),
        f = projectRamp(x, 1),
        dx = side ? 54 : -40;
      poly([b, { x: b.x + dx, y: b.y }, { x: f.x + dx, y: f.y }, f], "#c3ce8a");
      line(b, f, C.cream, 6);
      line(
        { x: b.x + dx, y: b.y - 37 },
        { x: f.x + dx, y: f.y - 37 },
        C.green,
        5,
      );
      for (let i = 0; i <= 3; i++) {
        const t = i / 3,
          p = { x: b.x + dx + (f.x - b.x) * t, y: b.y + (f.y - b.y) * t };
        line(p, { x: p.x, y: p.y - 39 }, C.ink, 4);
      }
    }
    const position = projectRamp(g.x);
    rider(position.x, position.y, 0.85);
    // Low foreground foliage adds a final plane without covering play space.
    for (let x = 0; x < 960; x += 33) {
      rect(x, 532 + (x % 3) * 2, 20, 10, C.tree);
      rect(x + 9, 527, 5, 10, C.leaf);
    }
  } else {
    sky(g.x);
    // Independent horizontal parallax planes preserve side-scrolling gameplay.
    for (let i = -1; i < 7; i++) {
      const x = i * 230 - ((g.x * 0.23) % 230);
      house(
        x,
        185 + (i % 2) * 10,
        170,
        112,
        i % 2 === 0 ? "#d5cfaa" : "#b9c9b4",
      );
    }
    for (let i = -1; i < 9; i++) tree(i * 150 - ((g.x * 0.42) % 150), 335, 0.8);
    rect(0, 330, 960, 34, "#8f9c73");
    for (let i = -1; i < 45; i++) {
      const x = i * 25 - ((g.x * 0.7) % 25);
      rect(x, 315, 8, 43, "#b4af80");
      rect(x + 2, 317, 3, 40, "#d3c99c");
    }
    rect(0, 326, 960, 5, "#c3bf92");
    // A deep pavement strip, diagonal seams, curb thickness and foreground grass.
    textured(
      [
        { x: 0, y: 354 },
        { x: 960, y: 354 },
        { x: 960, y: 391 },
        { x: 0, y: 391 },
      ],
      "#b9bda1",
    );
    rect(0, 391, 960, 9, "#737e69");
    rect(0, 391, 960, 3, C.cream);
    rect(0, 400, 960, 111, C.road);
    rect(0, 510, 960, 10, "#c5c3a0");
    rect(0, 520, 960, 20, C.tree);
    const camera = Math.max(0, g.x - 260);
    for (let i = -1; i < 12; i++) {
      const x = i * 115 - (camera % 115);
      line({ x: x + 24, y: 355 }, { x: x - 9, y: 390 }, "#929e83", 2);
      rect(x, 484, 61, 4, "#c1c4a3");
      rect(x - 30, 529, 22, 3, C.leaf);
    }
    for (const [i, cp] of checkpoints.entries()) {
      const p = projectCareer(cp.x, g.x);
      if (p.x < -30 || p.x > 990) continue;
      line({ x: p.x, y: 399 }, { x: p.x, y: 283 }, C.ink, 5);
      poly(
        [
          { x: p.x, y: 283 },
          { x: p.x + 58, y: 283 },
          { x: p.x + 48, y: 312 },
          { x: p.x, y: 312 },
        ],
        g.collected.includes(i) ? C.green : C.orange,
      );
      text(String(i + 1).padStart(2, "0"), p.x + 12, 304, 20, C.cream);
      rect(p.x - 14, 401, 28, 5, C.cream);
    }
    for (const obstacle of obstacles) {
      const p = projectCareer(obstacle.x, g.x);
      if (p.x < -80 || p.x > 1040) continue;
      rect(p.x - 24, p.y + 3, 50, 7, "#17271f50");
      if (obstacle.kind === "cone") {
        poly(
          [
            { x: p.x - 18, y: p.y },
            { x: p.x - 5, y: p.y - 44 },
            { x: p.x + 5, y: p.y - 44 },
            { x: p.x + 18, y: p.y },
          ],
          C.orange,
        );
        rect(p.x - 10, p.y - 27, 21, 7, C.cream);
        rect(p.x - 23, p.y - 3, 46, 6, C.ink);
      } else {
        rect(p.x - 27, p.y - 42, 54, 22, C.cream);
        for (let i = 0; i < 3; i++)
          rect(p.x - 25 + i * 19, p.y - 41, 9, 20, C.orange);
        rect(p.x - 22, p.y - 20, 6, 23, C.ink);
        rect(p.x + 17, p.y - 20, 6, 23, C.ink);
      }
    }
    const finish = projectCareer(FINISH, g.x);
    if (finish.x < 990 && finish.x > -30) {
      for (let row = 0; row < 9; row++)
        for (let col = 0; col < 2; col++)
          rect(
            finish.x + col * 12,
            400 + row * 12,
            12,
            12,
            (row + col) % 2 ? C.ink : C.cream,
          );
      text("FINISH", finish.x - 30, 380, 18);
    }
    const p = projectCareer(g.x, g.x);
    rider(p.x, p.y, 1);
  }

  if (g.status === "ready") {
    rect(20, 19, 190, 25, C.ink);
    text(
      g.mode === "freestyle" ? "FREESTYLE / HALF-PIPE" : "CAREER JAM / CITY",
      31,
      36,
      12,
    );
  }
  if (g.messageTime > 0 && g.mode === "freestyle") {
    const width = Math.min(610, g.message.length * 8 + 26);
    rect(480 - width / 2, 24, width, 27, C.ink);
    text(g.message, 493 - width / 2, 42, 13);
  }
}
