export class FrameTelemetry {
  private readonly samples: Float64Array;
  private cursor = 0;
  private count = 0;
  private total = 0;
  private simulationTotal = 0;
  private readonly simulationSamples: Float64Array;
  droppedSeconds = 0;

  constructor(capacity = 120) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Invalid sample capacity');
    this.samples = new Float64Array(capacity);
    this.simulationSamples = new Float64Array(capacity);
  }

  record(frameMs: number, simulationMs: number, droppedSeconds: number): void {
    if (![frameMs, simulationMs, droppedSeconds].every(v => Number.isFinite(v) && v >= 0)) return;
    this.total += frameMs - this.samples[this.cursor]!;
    this.simulationTotal += simulationMs - this.simulationSamples[this.cursor]!;
    this.samples[this.cursor] = frameMs;
    this.simulationSamples[this.cursor] = simulationMs;
    this.cursor = (this.cursor + 1) % this.samples.length;
    this.count = Math.min(this.count + 1, this.samples.length);
    this.droppedSeconds += droppedSeconds;
  }

  snapshot() {
    const frameMs = this.count ? this.total / this.count : 0;
    return {
      samples: this.count,
      frameMs,
      fps: frameMs > 0 ? 1000 / frameMs : 0,
      simulationMs: this.count ? this.simulationTotal / this.count : 0,
      droppedSeconds: this.droppedSeconds,
    };
  }
}
