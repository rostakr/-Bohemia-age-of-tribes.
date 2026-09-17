export interface StepResult {
  steps: number;
  alpha: number;
  droppedSeconds: number;
}

/** Simulation timing only. Rendering and browser events belong to the adapter. */
export class FixedStepClock {
  readonly stepSeconds: number;
  readonly maxSteps: number;
  readonly maxDeltaSeconds: number;
  tick = 0;
  private accumulator = 0;

  constructor(hz = 20, maxSteps = 5, maxDeltaSeconds = 0.25) {
    if (!Number.isFinite(hz) || hz <= 0 || !Number.isInteger(maxSteps) || maxSteps < 1 ||
        !Number.isFinite(maxDeltaSeconds) || maxDeltaSeconds <= 0) {
      throw new RangeError('Invalid fixed-step configuration');
    }
    this.stepSeconds = 1 / hz;
    this.maxSteps = maxSteps;
    this.maxDeltaSeconds = maxDeltaSeconds;
  }

  advance(deltaSeconds: number, step: (dt: number, tick: number) => void): StepResult {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('Frame delta must be finite and non-negative');
    }
    const accepted = Math.min(deltaSeconds, this.maxDeltaSeconds);
    let droppedSeconds = deltaSeconds - accepted;
    this.accumulator += accepted;
    let steps = 0;
    const epsilon = this.stepSeconds * 1e-9;
    while (this.accumulator + epsilon >= this.stepSeconds && steps < this.maxSteps) {
      step(this.stepSeconds, this.tick + 1);
      this.tick++;
      steps++;
      this.accumulator = Math.max(0, this.accumulator - this.stepSeconds);
    }
    // Drop wall time, never fabricate ticks or run an unbounded catch-up loop.
    if (this.accumulator + epsilon >= this.stepSeconds) {
      const overflow = Math.floor((this.accumulator + epsilon) / this.stepSeconds) * this.stepSeconds;
      droppedSeconds += overflow;
      this.accumulator = Math.max(0, this.accumulator - overflow);
    }
    return { steps, alpha: this.accumulator / this.stepSeconds, droppedSeconds };
  }

  /** Discard partial wall time on pause/resume; retain authoritative tick. */
  discardPendingTime(): void { this.accumulator = 0; }
}
