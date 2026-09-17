import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedStepClock } from '../src/core/fixed-step.ts';
import { FrameTelemetry } from '../src/debug/telemetry.ts';

test('simulation tick count does not depend on rendering frequency', () => {
  for (const fps of [30, 60, 144]) {
    const clock = new FixedStepClock();
    let elapsed = 0;
    for (let frame = 0; frame < fps * 10; frame++) {
      clock.advance(1 / fps, dt => { elapsed += dt; });
    }
    assert.equal(clock.tick, 200);
    assert.ok(Math.abs(elapsed - 10) < 1e-9);
  }
});

test('stall work is bounded and discarded time is reported', () => {
  const clock = new FixedStepClock(20, 3, 0.5);
  const ticks = [];
  const result = clock.advance(3, (_, tick) => ticks.push(tick));
  assert.deepEqual(ticks, [1, 2, 3]);
  assert.equal(result.steps, 3);
  assert.ok(Math.abs(result.droppedSeconds - 2.85) < 1e-9);
  assert.ok(result.alpha >= 0 && result.alpha < 1);
  assert.equal(clock.advance(0, () => assert.fail('Unexpected catch-up')).steps, 0);
});

test('pause/resume discards pending wall time without resetting ticks', () => {
  const clock = new FixedStepClock();
  clock.advance(0.075, () => {});
  clock.discardPendingTime();
  assert.equal(clock.tick, 1);
  assert.equal(clock.advance(0.025, () => assert.fail('Early tick')).steps, 0);
  assert.equal(clock.advance(0.025, () => {}).steps, 1);
});

test('invalid timing input cannot poison subsequent simulation', () => {
  const clock = new FixedStepClock();
  for (const value of [-1, NaN, Infinity]) assert.throws(() => clock.advance(value, () => {}), RangeError);
  assert.equal(clock.advance(0.05, () => {}).steps, 1);
  assert.throws(() => new FixedStepClock(0), RangeError);
  assert.throws(() => new FixedStepClock(20, 1.5), RangeError);
});

test('diagnostics retain only the rolling sample window', () => {
  const telemetry = new FrameTelemetry(3);
  for (const frame of [100, 10, 20, 30]) telemetry.record(frame, 1, 0.5);
  const result = telemetry.snapshot();
  assert.equal(result.samples, 3);
  assert.equal(result.frameMs, 20);
  assert.equal(result.fps, 50);
  assert.equal(result.simulationMs, 1);
  assert.equal(result.droppedSeconds, 2);
  telemetry.record(NaN, 0, 0);
  assert.deepEqual(telemetry.snapshot(), result);
});
