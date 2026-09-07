import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  step,
  obstacles,
  checkpoints,
  FINISH,
  projectRamp,
  projectCareer,
} from "../app/game/engine.ts";
const idle = { left: false, right: false, jump: false };
const playing = (mode) => ({ ...createGame(mode), status: "playing" });
function run(g, seconds, input = () => idle) {
  for (let n = 0; n < seconds * 60; n++) step(g, input(g, n), 1 / 60);
}
test("ready and paused sessions do not advance", () => {
  const g = createGame("career");
  const before = structuredClone(g);
  run(g, 2);
  assert.deepEqual(g, before);
  g.status = "paused";
  run(g, 2);
  assert.equal(g.time, 60);
});
test("one jump lands automatically and earns points", () => {
  for (const mode of ["career", "freestyle"]) {
    const g = playing(mode);
    step(g, { ...idle, jump: true }, 1 / 60);
    assert.ok(g.z > 0);
    run(g, 1);
    assert.equal(g.z, 0);
    assert.equal(g.landed, 1);
    assert.ok(g.score > 0);
    assert.equal(g.lives, 3);
    if (mode === "freestyle") assert.ok(g.crowdTime > 0);
  }
});
test("freestyle needs no precision controls to complete a session", () => {
  const g = playing("freestyle");
  run(g, 61);
  assert.equal(g.status, "finished");
  assert.equal(g.lives, 3);
  assert.ok(g.landed > 10);
  assert.ok(g.score > 0);
  assert.ok(g.x >= 110 && g.x <= 850);
});
test("left and right control movement in both modes", () => {
  for (const mode of ["career", "freestyle"]) {
    const left = playing(mode),
      right = playing(mode);
    run(left, 1, () => ({ ...idle, left: true }));
    run(right, 1, () => ({ ...idle, right: true }));
    assert.ok(left.x < right.x);
  }
});
test("career collisions cause a visible fall then automatic recovery", () => {
  const g = playing("career");
  g.x = obstacles[0].x;
  g.score = 500;
  g.collected = [0];
  step(g, idle, 1 / 60);
  assert.equal(g.lives, 2);
  assert.ok(g.fallTime > 0);
  assert.equal(g.score, 400);
  const x = g.x;
  run(g, 0.5);
  assert.equal(g.x, x);
  run(g, 1.3);
  assert.equal(g.fallTime, 0);
  assert.equal(g.lives, 2);
  assert.ok(g.x > x);
});
test("jumping clears a horizontal obstacle and lands automatically", () => {
  const g = playing("career");
  g.x = obstacles[0].x - 64;
  g.speed = 130;
  run(g, 1.1, (_, n) => ({ ...idle, jump: n === 0 }));
  assert.equal(g.lives, 3);
  assert.ok(g.x > obstacles[0].x + 24);
  assert.equal(g.z, 0);
});
test("final collision finishes after the fall animation", () => {
  const g = playing("career");
  g.lives = 1;
  g.x = obstacles[0].x;
  step(g, idle, 1 / 60);
  assert.equal(g.status, "playing");
  assert.equal(g.lives, 0);
  run(g, 1.2);
  assert.equal(g.status, "finished");
});
test("a complete horizontal run reaches every résumé checkpoint", () => {
  const g = playing("career");
  run(g, 40, (g) => ({
    ...idle,
    jump: g.z === 0 && obstacles.some((o) => o.x - g.x > 52 && o.x - g.x < 66),
  }));
  assert.equal(g.status, "finished");
  assert.equal(g.x, FINISH);
  assert.equal(g.lives, 3);
  assert.deepEqual(
    g.collected,
    checkpoints.map((_, i) => i),
  );
  assert.ok(g.score >= 3000);
  const score = g.score;
  run(g, 2);
  assert.equal(g.score, score);
});
test("braking stops horizontal travel and acceleration resumes it", () => {
  const g = playing("career");
  g.speed = 130;
  run(g, 2, () => ({ ...idle, left: true }));
  assert.ok(g.x < 125);
  assert.ok(g.speed < 0.01);
  run(g, 1, () => ({ ...idle, right: true }));
  assert.ok(g.x > 260);
  assert.ok(g.speed > 180);
});
test("crowd response expires and pausing freezes it", () => {
  const g = playing("freestyle");
  g.crowdTime = 2;
  g.status = "paused";
  run(g, 1);
  assert.equal(g.crowdTime, 2);
  g.status = "playing";
  run(g, 0.5);
  assert.ok(g.crowdTime < 2);
});
test("the career camera moves horizontally while the play surface stays level", () => {
  const start = projectCareer(100, 100),
    later = projectCareer(200, 200),
    following = projectCareer(1000, 1000);
  assert.ok(later.x > start.x);
  assert.equal(start.y, later.y);
  assert.equal(following.x, 260);
  assert.ok(projectCareer(1200, 1000).x > following.x);
  assert.ok(projectCareer(200, 200, 1).y > projectCareer(200, 200, 0).y);
});
test("ramp has visible front-to-back depth and elevated ends", () => {
  assert.ok(projectRamp(480, 1).y > projectRamp(480, 0).y + 100);
  assert.ok(projectRamp(110).y < projectRamp(480).y - 100);
  assert.ok(projectRamp(850).y < projectRamp(480).y - 100);
});
